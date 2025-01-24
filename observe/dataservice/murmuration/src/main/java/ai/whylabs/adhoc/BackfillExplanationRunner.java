package ai.whylabs.adhoc;

import ai.whylabs.adhoc.structures.BackfillExplainerRequest;
import ai.whylabs.adhoc.structures.BackfillExplainerResponse;
import ai.whylabs.core.aggregation.ExplodedRowsToAnalyzerResultsV3;
import ai.whylabs.core.aggregation.IngestionMetricToExplodedRow;
import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.configV3.structure.ColumnMatrix;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.IngestionMetric;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.utils.ClasspathFileLoader;
import ai.whylabs.core.utils.ConfigAwsSdk;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchOperations;
import com.google.common.base.Preconditions;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.NotImplementedException;

@Slf4j
public class BackfillExplanationRunner {
  public static final String TEST_COLUMN = "test";
  public static final String ORG_0 = "org-0";
  public static final String MODEL_0 = "model-0";

  public BackfillExplainerResponse run(BackfillExplainerRequest request) {

    ConfigAwsSdk.defaults();

    for (val a : request.getMonitorConfig().getAnalyzers()) {
      /**
       * We're more interested in what dates the analyzer would run so we override the column matrix
       * targeting in such a way that it'll always match our fuzzed data
       */
      if (a.getTarget().getClass().isAssignableFrom(ColumnMatrix.class)) {
        a.setTargetMatrix(ColumnMatrix.builder().include(Arrays.asList(TEST_COLUMN)).build());
      } else {
        throw new NotImplementedException(
            "Sorry, haven't tackled fuzzing the dataset matrix yet, remove the {} analyzer and try again",
            a.getId());
      }
    }
    Preconditions.checkNotNull(request.getCurrentTime(), "currentTime cannot be null");
    Preconditions.checkNotNull(request.getMonitorConfig(), "monitorConfig cannot be null");
    Preconditions.checkNotNull(request.getUploadedTime(), "uploadTime cannot be null");

    val currentTime = ZonedDateTime.parse(request.getCurrentTime());
    val uploadTime = ZonedDateTime.parse(request.getUploadedTime());

    val start = currentTime.minusYears(1);
    val conf = MonitorConfigV3JsonSerde.toString(request.getMonitorConfig());
    val runner = getRunner(conf, currentTime, null);
    val results = fuzzData(runner, start, 365, uploadTime, TargetLevel.column);
    results.addAll(fuzzData(runner, start, 365, uploadTime, TargetLevel.dataset));
    Map<String, List<String>> analyzerRunDates = new HashMap<>();
    for (val r : results) {
      String d =
          ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
              .toString();
      if (!analyzerRunDates.containsKey(r.getAnalyzerId())) {
        analyzerRunDates.put(r.getAnalyzerId(), new ArrayList<>());
      }
      analyzerRunDates.get(r.getAnalyzerId()).add(d);
    }

    val r = BackfillExplainerResponse.builder().analyzerRunDates(analyzerRunDates).build();
    return r;
  }

  public List<AnalyzerResult> fuzzData(
      ExplodedRowsToAnalyzerResultsV3 runner,
      ZonedDateTime start,
      int days,
      ZonedDateTime uploadTs,
      TargetLevel targetLevel) {

    long mostRecentDatasetTimestamp = 0l;
    long mostRecentUploadTimestamp = 0l;
    for (long x = 0; x < days * 24; x++) {
      // Fuzz data creating a datapoint for every hour over an entire year
      val datasetTimestamp = start.plusHours(x);
      mostRecentDatasetTimestamp =
          Math.max(mostRecentDatasetTimestamp, datasetTimestamp.toInstant().toEpochMilli());
      if (uploadTs == null) {
        // If its null Simulate all the data getting uploaded at midnight
        uploadTs = datasetTimestamp.truncatedTo(ChronoUnit.DAYS).plusDays(1);
      }
      mostRecentUploadTimestamp =
          Math.max(mostRecentUploadTimestamp, uploadTs.toInstant().toEpochMilli());

      switch (targetLevel) {
        case column:
          val featureRow =
              getFeatureRow(
                  datasetTimestamp.toInstant().toEpochMilli(),
                  uploadTs.toInstant().toEpochMilli(),
                  false);
          runner.call(featureRow);
          break;
        case dataset:
          val datasetLevelRow =
              getDatasetLevelRow(
                  datasetTimestamp.toInstant().toEpochMilli(),
                  uploadTs.toInstant().toEpochMilli(),
                  false);
          runner.call(datasetLevelRow);
          break;
        default:
          throw new NotImplementedException("Target level not supported " + targetLevel);
      }
    }
    List<AnalyzerResult> results = new ArrayList<>();
    // Simulate ingestion metric
    val ingestionMetric =
        getIngestionMetric(
            runner.getCurrentTime().toInstant().toEpochMilli(), mostRecentUploadTimestamp);
    runner.call(ingestionMetric).forEachRemaining(results::add);

    // Terminator row triggers result flush
    runner.call(getFeatureRow(0, 0, true)).forEachRemaining(results::add);
    return results;
  }

  public ExplodedRowsToAnalyzerResultsV3 getRunner(
      String jsonConfig,
      ZonedDateTime currentTime,
      BackfillAnalyzerRequest backfillAnalyzerRequest) {
    return getRunner(jsonConfig, currentTime, backfillAnalyzerRequest, new CalculationFactory());
  }

  public ExplodedRowsToAnalyzerResultsV3 getRunner(
      String jsonConfig,
      ZonedDateTime currentTime,
      BackfillAnalyzerRequest backfillAnalyzerRequest,
      CalculationFactory calculationFactory) {
    val configStructure = MonitorConfigV3JsonSerde.parseMonitorConfigV3(jsonConfig);

    val runner =
        new ExplodedRowsToAnalyzerResultsV3(
            currentTime, "testing", false, "", calculationFactory, 0l);
    runner.setMonitorConfigV3(configStructure);
    return runner;
  }

  public ExplodedRow getFeatureRow(
      long datasetTimestamp, long uploadTimestamp, boolean rowTerminator) {
    return ExplodedRow.builder()
        .ts(datasetTimestamp)
        .lastUploadTs(uploadTimestamp)
        .targetLevel(TargetLevel.column)
        .feedbackRow(false)
        .ingestionMetricRow(false)
        .rowTerminator(rowTerminator)
        .ingestionMetricRow(false)
        .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
        .histogram(KllDoublesSketchOperations.EMPTY_SKETCH.toByteArray())
        .orgId(ORG_0)
        .datasetId(MODEL_0)
        .missing(false)
        .segmentText("")
        .columnName(TEST_COLUMN)
        .uniqueCount(new byte[] {})
        .build();
  }

  public ExplodedRow getDatasetLevelRow(
      long datasetTimestamp, long uploadTimestamp, boolean rowTerminator) {
    return ExplodedRow.builder()
        .ts(datasetTimestamp)
        .lastUploadTs(uploadTimestamp)
        .targetLevel(TargetLevel.dataset)
        .feedbackRow(false)
        .ingestionMetricRow(false)
        .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
        .rowTerminator(rowTerminator)
        .ingestionMetricRow(false)
        .orgId(ORG_0)
        .datasetId(MODEL_0)
        .missing(false)
        .segmentText("")
        .columnName(BaseCalculationV3.DATASET_METRIC_ROW)
        .build();
  }

  @SneakyThrows
  public ExplodedRow getIngestionMetric(long currentTime, long uploadTimestamp) {
    return IngestionMetricToExplodedRow.get(
        IngestionMetric.builder()
            .datasetId(MODEL_0)
            .orgId(ORG_0)
            .targetTimestamp(currentTime)
            .lastUploadTs(uploadTimestamp)
            .segment("")
            .build());
  }

  @SneakyThrows
  public String getDruidQuery(String queryFile) {
    return new ClasspathFileLoader().getFileContents(queryFile);
  }
}
