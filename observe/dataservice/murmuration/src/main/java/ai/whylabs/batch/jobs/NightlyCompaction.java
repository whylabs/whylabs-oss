package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;

import ai.whylabs.batch.udfs.ExtractPartitionFromPartitionValueMap;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import io.delta.tables.DeltaTable;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;

/** Compaction job for entire deltalake */
@Slf4j
public class NightlyCompaction {
  public static final int TWO_DAYS_IN_HOURS = 24 * 2;
  // TODO: Drop
  private final int FULL_COMPACTION_THRESHOLD = 10000;
  private final int PARTITION_COMPACTION_THRESHOLD = 5000;

  private final int SirenDeltalakeTTLDays = 31;
  private final Long ANALYZER_RESULTS_NON_LATEST_VERSION_TTL_DAYS = 90l;
  private static final String PARTITION = "p";
  private static final String COUNT = "count";

  private List<String> getHotPartitions(SparkSession spark, String path) {
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
            .filter(col(COUNT).$greater(PARTITION_COMPACTION_THRESHOLD))
            .orderBy(col(COUNT).desc())
            .filter(col(PARTITION).isNotNull())
            // Avoid compacting the entire datalake in a single run, spread it out a bit
            .limit(5)
            .collectAsList();
    List<String> partitions = new ArrayList<>();
    for (val r : l) {
      String partitionName = r.getAs(PARTITION);
      long numFiles = r.getAs(COUNT);
      log.info(
          "Compaction queued up for partition {} on {} because it had {} files",
          partitionName,
          path,
          numFiles);
      partitions.add(partitionName);
    }
    return partitions;
  }

  public void compactProfiles(SparkSession spark, String profiles) {
    if (profiles != null) {
      log.info("Compacting {} ", profiles);
      val hotPartitions = getHotPartitions(spark, profiles);
      for (val partition : hotPartitions) {
        log.info("Running partial compaction on {} for {}", profiles, partition);
        DeltaTable.forPath(spark, profiles)
            .optimize()
            .where("partition = '" + partition + "'")
            .executeCompaction()
            .show();
      }

      if (hotPartitions.size() > 0) {
        log.info("Vacuum for {}", profiles);
        DeltaTable.forPath(spark, profiles).vacuum(24 * 7);
      }
    }
    // log.info("Overall profiles table has {} files", DeltaTable.forPath(spark,
    // profiles).deltaLog().snapshot().numOfFiles());
  }

  private List<String> getRandomPartitions(SparkSession spark, String path, int howMany) {
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
            .withColumn("rand", functions.rand())
            .orderBy(col("rand").desc())
            .filter(col(PARTITION).isNotNull())
            // Avoid compacting the entire datalake in a single run, spread it out a bit
            .limit(howMany)
            .collectAsList();
    List<String> partitions = new ArrayList<>();
    for (val r : l) {
      String partitionName = r.getAs(PARTITION);
      long numFiles = r.getAs(COUNT);
      log.info(
          "Compaction queued up for partition {} on {}. It had {} files",
          partitionName,
          path,
          numFiles);
      partitions.add(partitionName);
    }
    return partitions;
  }

  /**
   * Compact V1 profile datalake choosing partitions at random
   *
   * @param spark
   * @param v1ProfilesDatalake
   * @param howmany
   * @param parallelism
   * @param wait
   */
  @SneakyThrows
  public void v1ParallelizedAsyncCompactions(
      SparkSession spark, String v1ProfilesDatalake, int howmany, int parallelism, boolean wait) {
    if (v1ProfilesDatalake != null) {
      ExecutorService EXECUTOR = Executors.newFixedThreadPool(parallelism);
      log.info("Compacting {} ", v1ProfilesDatalake);

      val hotPartitions = getRandomPartitions(spark, v1ProfilesDatalake, howmany);
      for (val partition : hotPartitions) {
        EXECUTOR.submit(
            new Runnable() {
              @Override
              public void run() {
                long start = System.currentTimeMillis();
                log.info("Running partial compaction on {} for {} ", v1ProfilesDatalake, partition);
                DeltaTable.forPath(spark, v1ProfilesDatalake)
                    .optimize()
                    .where("yyyymmdd = '" + partition + "'")
                    .executeCompaction()
                    .show();
                log.info(
                    "Compaction on {} ran in {}ms", partition, System.currentTimeMillis() - start);
                DeltaTable.forPath(spark, v1ProfilesDatalake).vacuum(TWO_DAYS_IN_HOURS);
              }
            });
      }

      EXECUTOR.shutdown();
      if (wait) {
        EXECUTOR.awaitTermination(5, TimeUnit.HOURS);
      }
    }
  }

  public void vacumeSirenDatalakes(
      SparkSession spark, String sirenDigestDatalake, String sirenEveryAnomalyDatalake) {
    /** This is just for debugging so we never bother compacting, just maintain a 7d TTL */
    val cutoff = ZonedDateTime.now().minusDays(SirenDeltalakeTTLDays).toInstant().toEpochMilli();
    if (sirenDigestDatalake != null && DeltalakeWriter.doesTableExist(sirenDigestDatalake)) {
      DeltaTable.forPath(spark, sirenDigestDatalake).delete(col("ts").leq(cutoff));
      DeltaTable.forPath(spark, sirenDigestDatalake).vacuum(24 * SirenDeltalakeTTLDays);
    }
    if (sirenEveryAnomalyDatalake != null
        && DeltalakeWriter.doesTableExist(sirenEveryAnomalyDatalake)) {
      DeltaTable.forPath(spark, sirenEveryAnomalyDatalake).delete(col("ts").leq(cutoff));
      DeltaTable.forPath(spark, sirenEveryAnomalyDatalake).vacuum(24 * SirenDeltalakeTTLDays);
    }
    // log.info(        "Overall sirenEveryAnomalyDatalake table has {} files",
    // DeltaTable.forPath(spark, sirenEveryAnomalyDatalake).deltaLog().snapshot().numOfFiles());
  }

  public void compactAnalyerResultsV3(SparkSession spark, String analyzerResultsPath) {
    if (analyzerResultsPath != null
        && DeltalakeWriter.doesTableExist(analyzerResultsPath)
        && DeltaTable.forPath(spark, analyzerResultsPath).deltaLog().snapshot().numOfFiles()
            > FULL_COMPACTION_THRESHOLD) {
      long cutoff =
          ZonedDateTime.now(ZoneOffset.UTC)
              .minusDays(ANALYZER_RESULTS_NON_LATEST_VERSION_TTL_DAYS)
              .toInstant()
              .toEpochMilli();

      log.info(
          "Removing non-latest versions of the v3 analyzer results created before {} and running compaction",
          cutoff);
      DeltaTable.forPath(spark, analyzerResultsPath)
          .delete(
              col(AnalyzerResult.Fields.latest)
                  .equalTo(functions.lit(false))
                  .and(col(AnalyzerResult.Fields.creationTimestamp).leq(cutoff)));

      DeltaTable.forPath(spark, analyzerResultsPath).optimize().executeCompaction().show();
      DeltaTable.forPath(spark, analyzerResultsPath).vacuum(24 * 5);
    } else {
      log.info("Skipping analyzer result compaction as its not needed");
    }
    // log.info("Overall analyzerResultsPath table has {} files",        DeltaTable.forPath(spark,
    // analyzerResultsPath).deltaLog().snapshot().numOfFiles());
  }

  public void compactMonitorConfigV3(SparkSession spark, String monitorsConfigV3) {
    log.info(
        "Overall monitorsConfigV3 table has {} files",
        DeltaTable.forPath(spark, monitorsConfigV3).deltaLog().snapshot().numOfFiles());
    if (monitorsConfigV3 != null
        && DeltalakeWriter.doesTableExist(monitorsConfigV3)
        && DeltaTable.forPath(spark, monitorsConfigV3).deltaLog().snapshot().numOfFiles()
            > FULL_COMPACTION_THRESHOLD) {
      log.info("Compacting {} ", monitorsConfigV3);
      DeltaTable.forPath(spark, monitorsConfigV3).optimize().executeCompaction().show();
      DeltaTable.forPath(spark, monitorsConfigV3).vacuum(24 * 90);
    } else {
      log.info("Skipping monitor config compaction as its not needed");
    }
  }

  public void compactMonitorRuns(SparkSession spark, String analyzerRuns) {
    if (analyzerRuns != null
        && DeltalakeWriter.doesTableExist(analyzerRuns)
        && DeltaTable.forPath(spark, analyzerRuns).deltaLog().snapshot().numOfFiles()
            > FULL_COMPACTION_THRESHOLD) {
      log.info("Compacting {}", analyzerRuns);
      DeltaTable.forPath(spark, analyzerRuns).optimize().executeCompaction().show();
      DeltaTable.forPath(spark, analyzerRuns).vacuum(24 * 5);
    } else {
      log.info("Skipping monitor run compaction as its not needed");
    }
    // log.info("Overall analyzerRuns table has {} files", DeltaTable.forPath(spark,
    // analyzerRuns).deltaLog().snapshot().numOfFiles());
  }
}
