package ai.whylabs.batch.jobs.base;

import ai.whylabs.batch.session.SparkSessionFactory;
import ai.whylabs.core.enums.Granularity;
import ai.whylabs.core.utils.ClasspathFileLoader;
import ai.whylabs.core.utils.ConfigAwsSdk;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.JCommander.Builder;
import com.beust.jcommander.Parameter;
import com.google.common.base.Preconditions;
import java.io.Serializable;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.joda.time.DateTimeZone;

/** A base class for running Spark job */
@Slf4j
@RequiredArgsConstructor
@Setter
public abstract class AbstractSparkJob implements AutoCloseable, Serializable, Job {
  @Parameter(
      names = "-sparkMaster",
      description =
          "(optional) local[2] for embeded mode with 2 cores, yarn-client to run driver on EMR")
  @Setter
  protected String sparkMaster;

  @Parameter(
      names = "-duration",
      description = "The duration of the batch. Use ISO 8640 format (P1D, PT1H, ALL)")
  protected String duration = Granularity.P1D.name();

  @Parameter(
      names = "-currentTime",
      description =
          "Start time of the interval. Will be round down to match the beginning of the interval")
  protected String currentTime;

  @Parameter(names = "-runId", description = "A unique run ID everytime we pull the configs")
  protected String runId = UUID.randomUUID().toString();

  @Setter public transient ZonedDateTime currentTimestamp;

  protected SparkSession spark;
  private volatile boolean isExternalSpark = false;

  public void setSpark(SparkSession spark) {
    this.spark = spark;
    this.isExternalSpark = true;
  }

  /**
   * Enable user to further configure the Spark session
   *
   * @param builder a session builder
   */
  protected void configSpark(SparkSession.Builder builder) {
    // do nothing
  }

  protected void start() {
    if (spark == null) {
      val builder =
          SparkSessionFactory.getSparkSessionBuilder(
              sparkMaster, null, this.getClass().getSimpleName());
      configSpark(builder);
      spark = builder.getOrCreate();
    }
  }

  public final void run(String[] args) {
    ConfigAwsSdk.defaults();
    DateTimeZone.setDefault(DateTimeZone.UTC);

    this.apply(args);

    this.start();
    this.runBefore();
    val result = this.calculate();
    this.runAfter(result);
  }

  protected Builder parserBuilder() {
    return JCommander.newBuilder().acceptUnknownOptions(true).addObject(this);
  }

  public void apply(String[] args) {
    parserBuilder().build().parse(args);
    if (!Granularity.P1D.name().equalsIgnoreCase(duration)) {
      throw new IllegalArgumentException("Unsupported duration string: " + duration);
    }
    if (currentTime != null) {
      this.currentTimestamp =
          ZonedDateTime.parse(currentTime, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
              .truncatedTo(ChronoUnit.HOURS);
      log.info("Job run ID: {} currentTimestamp {}", runId, currentTimestamp);
    }
  }

  public void runBefore() {
    Preconditions.checkNotNull(spark);
  }

  public void runAfter(Dataset<Row> result) {
    // do nothing
  }

  public abstract Dataset<Row> calculate();

  @SneakyThrows
  protected String getDruidQuery(String queryFile) {
    return new ClasspathFileLoader().getFileContents(queryFile);
  }

  @Override
  public void close() {
    if (isExternalSpark) {
      log.warn("Won't close external Spark session");
      return;
    }
    if (spark == null || spark.sparkContext().isStopped()) {
      log.info("No active Spark session to close");
      return;
    }
    spark.close();
  }
}
