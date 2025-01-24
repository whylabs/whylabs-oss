package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.*;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.udfs.ExtractPartitionFromPartitionValueMap;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;

/**
 * Doing one big optimize on an entire datalke is really slow. Databricks could should do better. I
 * found the best road is to optimize individual partitions separately, but highly parallelize the
 * job submission.
 */
@Slf4j
public class FullCompactionJob extends AbstractSparkJob {

  @Parameter(
      names = "-profilesDatalakeV2",
      description = "Output location of the v2 profiles datalake")
  private String profilesDatalakeV2;

  @Parameter(
      names = {"-monitorConfigV3", "monitorsConfigV3"},
      description = "monitorConfigV3 deltalake",
      required = false)
  private String monitorConfigV3;

  @Parameter(
      names = "-analyzerRuns",
      description =
          "If set, we will output metadata about each monitor run and individual errors with bad configurations",
      required = false)
  protected String analyzerRuns;

  @Parameter(
      names = "-analyzerResultsPath",
      description = "Primary output of analysis",
      required = false)
  protected String analyzerResultsPath;

  @Parameter(
      names = "-sirenDigestDatalake",
      description =
          "We sink the digests we send out to a deltalake in case we need to investigate an issue",
      required = false)
  String sirenDigestDatalake;

  @Parameter(
      names = "-sirenEveryAnomalyDatalake",
      description =
          "We sink the every anomaly payloads to a deltalake in case we need to investigate an issue",
      required = false)
  String sirenEveryAnomalyDatalake;

  private static final String PARTITION = "p";
  public static final int TWO_DAYS_IN_HOURS = 24 * 2;
  public static final int SEVEN_DAYS_IN_HOURS = 24 * 7;

  ExecutorService COMPACTION_EXECUTOR = Executors.newFixedThreadPool(100);
  ExecutorService VACUUM_EXECUTOR = Executors.newFixedThreadPool(10);

  private List<String> listPartitions(SparkSession spark, String path) {
    val e = udf(new ExtractPartitionFromPartitionValueMap(), DataTypes.StringType);
    val l =
        DeltaTable.forPath(spark, path)
            .deltaLog()
            .snapshot()
            .allFiles()
            .toDF()
            .withColumn(PARTITION, e.apply(col("partitionValues")))
            .groupBy(PARTITION)
            .count()
            // Randomize the order we tackle partitions so if the job fails to finish we tackle
            // different ones on the next attempt
            .withColumn("rand", functions.rand())
            .orderBy(col("rand").desc())
            .filter(col(PARTITION).isNotNull())
            .collectAsList();
    List<String> partitions = new ArrayList<>();
    for (val r : l) {
      String partitionName = r.getAs(PARTITION);
      partitions.add(partitionName);
    }
    return partitions;
  }

  @SneakyThrows
  @Override
  public Dataset<Row> calculate() {
    compactPartitionedDatalake(profilesDatalakeV2, "yyyymmdd");
    compactPartitionedDatalake(analyzerResultsPath, "yyyymmdd");
    compactUnPartitionedDatalake(analyzerRuns);
    compactUnPartitionedDatalake(monitorConfigV3);
    compactUnPartitionedDatalake(sirenDigestDatalake);
    compactUnPartitionedDatalake(sirenEveryAnomalyDatalake);

    vacuum(profilesDatalakeV2, TWO_DAYS_IN_HOURS);
    vacuum(analyzerResultsPath, TWO_DAYS_IN_HOURS);
    vacuum(analyzerRuns, SEVEN_DAYS_IN_HOURS);
    vacuum(monitorConfigV3, SEVEN_DAYS_IN_HOURS);
    vacuum(sirenDigestDatalake, SEVEN_DAYS_IN_HOURS);
    vacuum(sirenEveryAnomalyDatalake, SEVEN_DAYS_IN_HOURS);

    COMPACTION_EXECUTOR.shutdown();
    VACUUM_EXECUTOR.shutdown();
    COMPACTION_EXECUTOR.awaitTermination(1, TimeUnit.HOURS);
    VACUUM_EXECUTOR.awaitTermination(1, TimeUnit.HOURS);

    return null;
  }

  public void vacuum(String path, int hours) {
    VACUUM_EXECUTOR.submit(
        new Runnable() {
          @Override
          public void run() {
            long start = System.currentTimeMillis();
            log.info("Running Vacuum on {} ", path);

            DeltaTable.forPath(spark, path).vacuum(hours);
            log.info("{} Vacuum on {} took {}ms", path, System.currentTimeMillis() - start);
          }
        });
  }

  @SneakyThrows
  public void compactPartitionedDatalake(String path, String partitionColumn) {
    if (path != null) {
      log.info("Compacting {} ", path);
      val hotPartitions = listPartitions(spark, path);
      for (val partition : hotPartitions) {
        COMPACTION_EXECUTOR.submit(
            new Runnable() {
              @Override
              public void run() {
                long start = System.currentTimeMillis();
                log.info("Running partial compaction on {} for {} ", path, partition);

                DeltaTable.forPath(spark, path)
                    .optimize()
                    .where(partitionColumn + " = '" + partition + "'")
                    .executeCompaction()
                    .show();
                log.info(
                    "{} Compaction on {} took {}ms",
                    path,
                    partition,
                    System.currentTimeMillis() - start);
              }
            });
      }
    }
  }

  @SneakyThrows
  public void compactUnPartitionedDatalake(String path) {
    if (path != null) {
      COMPACTION_EXECUTOR.submit(
          new Runnable() {
            @Override
            public void run() {
              long start = System.currentTimeMillis();
              log.info("Running compaction on {} ", path);

              DeltaTable.forPath(spark, path).optimize().executeCompaction().show();
              log.info("{} Compaction took {}ms", path, System.currentTimeMillis() - start);
            }
          });
    }
  }

  public static void main(String[] args) {
    try (val job = new FullCompactionJob()) {
      job.run(args);
    }
  }
}
