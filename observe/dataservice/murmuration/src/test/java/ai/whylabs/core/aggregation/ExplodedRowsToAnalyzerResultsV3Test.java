package ai.whylabs.core.aggregation;

import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.classification_accuracy;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.classification_f1;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.classification_fpr;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.classification_precision;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.classification_recall;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.instanceOf;
import static org.testng.Assert.assertEquals;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.StddevCalculation;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ComparisonConfig;
import ai.whylabs.core.configV3.structure.Analyzers.StddevConfig;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.ColumnMatrix;
import ai.whylabs.core.configV3.structure.CronSchedule;
import ai.whylabs.core.configV3.structure.DatasetMatrix;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.structures.DatalakeRowV2Metric;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.utils.ClasspathFileLoader;
import ai.whylabs.core.utils.DatalakeRowV2MetricChunker;
import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Test;

public class ExplodedRowsToAnalyzerResultsV3Test {
  MonitorConfigV3 monitorConfig;
  Baseline baseline_7days = TrailingWindowBaseline.builder().size(7).build();
  Baseline baseline_30days = TrailingWindowBaseline.builder().size(30).build();
  Segment overall = Segment.builder().build();

  @SneakyThrows
  protected String getDruidQuery(String queryFile) {
    return new ClasspathFileLoader().getFileContents(queryFile);
  }

  @BeforeSuite
  public void mkMonitorConfig() {
    List<Analyzer> analyzers = new ArrayList<>();

    for (val metric :
        Arrays.asList(
            classification_recall,
            classification_fpr,
            classification_precision,
            classification_accuracy,
            classification_f1)) {
      analyzers.add(
          Analyzer.builder()
              .id("model_performance_" + metric)
              .disabled(false)
              .config(StddevConfig.builder().metric(metric.name()).baseline(baseline_7days).build())
              .targetMatrix(DatasetMatrix.builder().segments(Arrays.asList(overall)).build())
              .schedule(CronSchedule.builder().cron("0 * * * *").build())
              .build());
    }

    analyzers.add(
        Analyzer.builder()
            .id("unique_analyzer_1")
            .disabled(false)
            .config(
                StddevConfig.builder()
                    .baseline(baseline_30days)
                    .metric(AnalysisMetric.inferred_data_type.name())
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    // This analyzer has No allowed fields (exclude=*) - it should never generate any
    // calculations.
    analyzers.add(
        Analyzer.builder()
            .id("analyzer3")
            .disabled(false)
            .config(
                ComparisonConfig.builder()
                    .baseline(baseline_30days)
                    .metric(AnalysisMetric.inferred_data_type.name())
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .include(Arrays.asList("allowed_field"))
                    .exclude(Arrays.asList("*"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    monitorConfig = MonitorConfigV3.builder().analyzers(analyzers).build();
  }

  @Test
  public void testInit() {
    val currentTime = ZonedDateTime.of(2021, 9, 22, 10, 0, 0, 0, ZoneOffset.UTC);
    val target = new QueryResultStructure(ExplodedRow.builder().segmentText("").build(), null);

    val rows2Metrics =
        new ExplodedRowsToAnalyzerResultsV3(
            currentTime, "testing", true, "", new CalculationFactory(), 0l);

    List<BaseCalculationV3> m;

    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            DatasetMetrics.INTERNAL_PREFIX,
            rows2Metrics.fromAnalyzer(monitorConfig.getAnalyzers().get(0)));
    assertEquals(m.size(), 5);

    // None of the dataset metrics have a 30d baseline
    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            DatasetMetrics.INTERNAL_PREFIX,
            AggregationKey.builder()
                .targetLevel(TargetLevel.dataset)
                .baseline(baseline_30days)
                .build());
    assertEquals(m.size(), 0);

    for (val c : m) {
      assertThat(c, instanceOf(StddevCalculation.class));
      assertEquals(c.getAnalyzer().getTarget().getLevel(), TargetLevel.dataset);
    }

    // TargetLevel.field and feature name "unknown" will match .include("*")
    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            "unknown",
            AggregationKey.builder()
                .targetLevel(TargetLevel.column)
                .baseline(baseline_30days)
                .disableTargetRollup(false)
                .targetProfileId(null)
                .build());
    assertEquals(m.size(), 1);
    for (val c : m) {
      assertThat(c, instanceOf(StddevCalculation.class));
      assertEquals(c.getAnalyzer().getTarget().getLevel(), TargetLevel.column);
    }

    // allowed_field would match both column analyzers if analyzer3 didn't exclude *
    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            "allowed_field",
            AggregationKey.builder()
                .targetLevel(TargetLevel.column)
                .baseline(baseline_30days)
                .disableTargetRollup(false)
                .targetProfileId(null)
                .build());
    assertEquals(m.size(), 1);
    for (val c : m) {
      assertThat(c, instanceOf(StddevCalculation.class));
      assertEquals(c.getAnalyzer().getTarget().getLevel(), TargetLevel.column);
    }

    // None of the column level analyzers have a 7d baseline
    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            "allowed_field",
            AggregationKey.builder()
                .targetLevel(TargetLevel.column)
                .baseline(baseline_7days)
                .disableTargetRollup(false)
                .targetProfileId(null)
                .build());
    assertEquals(m.size(), 0);

    // feature is blocked by exclude("acc_now_delinq")
    m =
        rows2Metrics.initCalculations(
            target,
            null,
            monitorConfig,
            "acc_now_delinq",
            AggregationKey.builder()
                .targetLevel(TargetLevel.column)
                .baseline(baseline_30days)
                .disableTargetRollup(false)
                .targetProfileId(null)
                .build());
    assertEquals(m.size(), 0);
  }

  @Test
  public void testDatalakeRowChunker() {
    List<DatalakeRowV2Metric> metrics = new ArrayList<>();
    metrics.add(DatalakeRowV2Metric.builder().metricPath("kll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("hll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("counts/n").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("kll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("hll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("counts/n").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("kll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("hll").build());
    metrics.add(DatalakeRowV2Metric.builder().metricPath("counts/n").build());
    assertEquals(3, DatalakeRowV2MetricChunker.getChunks(metrics).size());
  }
}
