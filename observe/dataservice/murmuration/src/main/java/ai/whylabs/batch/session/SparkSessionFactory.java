package ai.whylabs.batch.session;

import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import ai.whylabs.core.collectors.ExplodedRowCollectorV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import ai.whylabs.core.configV3.structure.Analyzers.DiffMode;
import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonOperator;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.*;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.enums.ExtendedChronoUnit;
import ai.whylabs.core.enums.ModelType;
import ai.whylabs.core.structures.AnalysisBuffer;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import lombok.val;
import org.apache.spark.SparkConf;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.SparkSession.Builder;
import org.jetbrains.annotations.NotNull;

public class SparkSessionFactory {

  public static synchronized SparkSession getSparkSession(
      String sparkMaster, Map<String, String> extraConfigs, String jobName) {
    val sparkSessionBuilder = getSparkSessionBuilder(sparkMaster, extraConfigs, jobName);

    return sparkSessionBuilder.getOrCreate();
  }

  private static SparkConf getConfig() {
    SparkConf conf = new SparkConf();

    conf.registerKryoClasses(
        Arrays.asList(
                AnalysisBuffer.class,
                ExplodedRow.class,
                AnalyzerResult.class,
                ZonedDateTime.class,
                HashMap.class,
                Long.class,
                Integer.class,
                Boolean.class,
                String.class,
                ArrayList.class,
                ExplodedRowCollectorV3.class,
                MonitorConfigV3.class,
                TrailingWindowBaseline.class,
                ReferenceProfileId.class,
                TimeRangeBaseline.class,
                SingleBatchBaseline.class,
                Classifier.class,
                DataType.class,
                DiscretenessType.class,
                Granularity.class,
                ModelType.class,
                TargetLevel.class,
                Analyzer.class,
                ModelType.class,
                AggregationDataGranularity.class,
                ExtendedChronoUnit.class,
                ColumnListChangeMode.class,
                FrequentStringComparisonOperator.class,
                DiffMode.class,
                ThresholdType.class)
            .toArray(new Class[0]));
    return conf;
  }

  @NotNull
  public static Builder getSparkSessionBuilder(
      String sparkMaster, Map<String, String> extraConfigs, String jobName) {
    val sparkSessionBuilder =
        SparkSession.builder()
            .appName(jobName)
            .config(getConfig())
            .config("spark.hadoop.mapreduce.input.fileinputformat.input.dir.recursive", "true")
            // Make vacuum operations not take forever https://github.com/delta-io/delta/issues/220
            // .config("spark.sql.sources.parallelPartitionDiscovery.parallelism", "20")
            // https://kb.databricks.com/delta/delta-merge-into.html
            .config("spark.databricks.optimizer.dynamicPartitionPruning", "true")
            .config("spark.databricks.delta.schema.autoMerge.enabled", "true")

            // Make room for higher job execution parallelism per datalake job batch
            // Allow aggressive deltalake vacuum operations
            .config("spark.databricks.delta.retentionDurationCheck.enabled", "false")
            .config("spark.kryoserializer.buffer.max", "1024m")

            /**
             * Caused by: java.lang.RuntimeException: Cannot reserve additional contiguous bytes in
             * the vectorized reader (integer overflow). As a workaround, you can reduce the
             * vectorized reader batch size, or disable the vectorized reader, or disable
             * spark.sql.sources.bucketing.enabled if you read from bucket table. For Parquet file
             * format, refer to spark.sql.parquet.columnarReaderBatchSize (default 4096) and
             * spark.sql.parquet.enableVectorizedReader; for ORC file format, refer to
             * spark.sql.orc.columnarReaderBatchSize (default 4096) and
             * spark.sql.orc.enableVectorizedReader.
             *
             * <p>Can probably drop once we're on V1 deltalake
             */
            .config("spark.sql.parquet.enableVectorizedReader", "false")
            // .config("spark.sql.adaptive.enabled", "false")

            /**
             * 100MB, This sets a floor for how small of a file will get picked up for compaction.
             * By default its 1GB which is the target file size as well so most of the time a file
             * will be eligible for compaction on every single run. Come on databricks, it's silly
             * to have default min=target.
             */
            .config("spark.databricks.delta.optimize.minFileSize", "52428800")
            /**
             * Default 15, if you need some extra horsepower on a big optimize this can be bumped.
             * This would mean 15 parquet files are being written out concurrently during a
             * compaction. This should grow as our cluster grows. Should probably mirror our CPU
             * core count, but I haven't studied it enough to make that call.
             */
            .config("spark.databricks.delta.optimize.maxThreads", "60")
            .config("spark.driver.maxResultSize", "2G")
            .config("spark.sql.shuffle.partitions", "1000")
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.session.timeZone", "UTC")
            .config("spark.driver.maxResultSize", "2G")
            // TODO: Evaluate if this helps next time we hit some memory issues
            // .config("spark.memory.fraction", .4)
            // increase broadcast timeout to 10 seconds
            .config("spark.sql.broadcastTimeout", "10000")

            /**
             * The following two settings are related to a spark bug which should be fixed pending
             * the upgrade. https://issues.apache.org/jira/browse/SPARK-40588
             */
            .config("spark.sql.optimizer.plannedWrite.enabled", false)
            .config("spark.sql.adaptive.enabled", false)
            .config("spark.sql.autoBroadcastJoinThreshold", 12 * 1024 * 1024) // 10GB
            .config("spark.cleaner.referenceTracking.cleanCheckpoints", "true")
            .config(
                "spark.delta.logStore.class",
                "org.apache.spark.sql.delta.storage.S3SingleDriverLogStore")
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config(
                "spark.sql.catalog.spark_catalog",
                "org.apache.spark.sql.delta.catalog.DeltaCatalog")
            .config("spark.driver.maxResultSize", "2G")
            .config("spark.databricks.delta.vacuum.parallelDelete.enabled", "true") //
        ;

    if (sparkMaster != null) {
      sparkSessionBuilder.master(sparkMaster);
      if (sparkMaster.startsWith("local")) {
        sparkSessionBuilder
            // Drop parallelism when running on your laptop for reduced overhead
            .config("spark.default.parallelism", "5")
            .config("spark.sql.shuffle.partitions", "5")
            .config("spark.sql.sources.parallelPartitionDiscovery.parallelism", "20")
            .config(
                "spark.hadoop.fs.s3a.aws.credentials.provider",
                WhyLabsCredentialsProviderChain.class.getName())
            // fail fast locally
            .config("spark.yarn.maxAppAttempts", "1")
            .config("spark.yarn.maxAppAttempts", "1")
            .config("spark.driver.host", "127.0.0.1")
            .config("spark.driver.memory", "1G")
            // Helps avoid OOMs and speed up unit tests, but disables the spark UI when local
            .config("spark.ui.enabled", "false")
            .config("spark.eventLog.enabled", "false")
            .config("spark.hadoop.fs.s3.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem");
      }
    }

    if (extraConfigs != null) {
      for (val c : extraConfigs.entrySet()) {
        sparkSessionBuilder.config(c.getKey(), c.getValue());
      }
    }
    return sparkSessionBuilder;
  }
}
