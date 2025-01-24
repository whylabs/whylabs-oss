package ai.whylabs.batch.jobs;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row.Fields;
import com.beust.jcommander.Parameter;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;

@Slf4j
public class MonitorConfigV3DumpTool extends AbstractSparkJob {

  @Parameter(
      names = "-monitorsConfigV3",
      description = "Path of the deltalake table for monitor config data",
      required = true)
  protected String monitorsConfigV3;

  @Parameter(
      names = "-orgId",
      description = "Target org ID to filter data by. Useful when targeting an organization")
  protected String orgId;

  @Parameter(
      names = "-datasetId",
      description =
          "Target dataset ID to filter the data by. Useful when working with a single dataset ID")
  protected String datasetId;

  public static void main(String[] args) {
    new MonitorConfigV3DumpTool().run(args);
  }

  @Override
  public void apply(String[] args) {
    super.apply(args);
  }

  @SneakyThrows
  @Override
  public void runBefore() {
    super.runBefore();
  }

  @Override
  public Dataset<Row> calculate() {
    val eventsJob = new EventsJobV3();
    eventsJob.setSpark(spark);
    eventsJob.setMonitorsConfigV3(monitorsConfigV3);
    eventsJob.setCurrentTimestamp(ZonedDateTime.now().truncatedTo(ChronoUnit.DAYS));
    eventsJob.setOrgIds(Collections.singletonList(orgId));
    eventsJob.setDatasetId(datasetId);

    Dataset<MonitorConfigV3Row> configs = eventsJob.cacheMonitorConfig();
    if (orgId != null) {
      configs = configs.filter(functions.col(Fields.orgId).equalTo(functions.lit(orgId)));
    }
    if (datasetId != null) {
      configs = configs.filter(functions.col(Fields.datasetId).equalTo(functions.lit(datasetId)));
    }
    for (val c : configs.collectAsList()) {
      val ts = ZonedDateTime.ofInstant(Instant.ofEpochMilli(c.getUpdatedTs()), ZoneOffset.UTC);
      log.info("Org {}, Dataset {}, updated {}", c.getOrgId(), c.getDatasetId(), ts);
      log.info(c.getJsonConf());
    }
    return null;
  }
}
