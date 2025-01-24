package ai.whylabs.batch.jobs;

import ai.whylabs.batch.jobs.base.Job;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * A backfill job for loading a deltalake.
 *
 * <p>Example: Rerun monitor and populate druid spark-submit --deploy-mode client --conf
 * spark.executor.memory=4g --conf spark.executor.cores=2 --class ai.whylabs.batch.jobs.BackfillJob
 * s3://p-drew-artifacts20210628165227053400000002/artifacts/murmuration/murmuration-bundle-740ad947.jar
 * -sparkMaster yarn -source s3://development-deltalake-20210520193724829400000001/whylogs/
 * -segmentsConfig s3://development-deltalake-20210520193724829400000001/segments-config/
 * -monitorsConfig s3://development-deltalake-20210520193724829400000001/monitors-config/
 * -eventsPath s3://development-deltalake-20210520193724829400000001/events/ -songbirdEndpoint
 * https://songbird.development.whylabsdev.com -s3SnapshotStagingArea
 * s3://development-deltalake-20210520193724829400000001/druidSnapshot/events/1630358287128/
 * -datasourceNamespace development-whylabs -time 2021-08-29T01:00:00Z -nDays 30 -job
 * ai.whylabs.batch.jobs.EventsJob -skipSongbirdSink
 */
@Slf4j
public class BackfillJob implements Job {
  @Parameter(names = "-job", description = "The full name of the job class", required = true)
  private String job;

  @Parameter(
      names = "-time",
      description =
          "The time to target the run. This is translated into current time for the batches",
      required = true)
  private String time;

  @Parameter(names = "-n", description = "Number of granularity to look back", required = true)
  private int n;

  @Parameter(
      names = "-granularity",
      description = "Granularity, allowed values HOURS, DAYS, WEEKS",
      required = true)
  private String granularity;

  public static void main(String[] args)
      throws ClassNotFoundException, InstantiationException, IllegalAccessException {
    val backfillJob = new BackfillJob();
    backfillJob.run(args);
  }

  @Override
  @SneakyThrows
  public void run(String[] args) {
    JCommander.newBuilder().acceptUnknownOptions(true).addObject(this).build().parse(args);

    val clazz = BackfillJob.class.getClassLoader().loadClass(job);
    val job = (Job) clazz.newInstance();

    val datetime = ZonedDateTime.parse(time, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    val g = ChronoUnit.valueOf(granularity.toUpperCase());

    for (int i = 0; i < n; i++) {
      val format = datetime.minus(i, g).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      val arguments =
          Stream.concat(Stream.of(args), Stream.of("-currentTime", format)).toArray(String[]::new);
      log.info("Arguments: {}", Arrays.toString(arguments));
      runJob(arguments, job);
    }
  }

  private void runJob(String[] arguments, Job job) {
    job.run(arguments);
  }
}
