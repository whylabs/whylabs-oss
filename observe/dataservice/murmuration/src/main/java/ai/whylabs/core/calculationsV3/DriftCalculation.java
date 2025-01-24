package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.DriftCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.py.PyChartInput;
import ai.whylabs.py.PyDriftChartFunctionV2;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

public abstract class DriftCalculation<T> extends BaseCalculationV3<T, DriftCalculationResult> {

  protected final DriftConfig config;
  protected final Boolean enableChart;

  public DriftCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      DriftConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
    this.enableChart = Boolean.valueOf(config.getParams().get("enableAnomalyCharts"));
  }

  @Override
  public boolean requireRollup() {
    return true;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return DriftCalculationResult.builder()
            .metricValue(analyzerResult.getDrift_metricValue())
            .alertCount(analyzerResult.getAnomalyCount())
            .threshold(analyzerResult.getDrift_threshold())
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    if (!this.enableChart) {
      return false;
    }
    // prior results are not ordered - sort by timestamp before plotting.
    results.sort(
        new Comparator<Pair<Long, CalculationResult>>() {
          @Override
          public int compare(Pair<Long, CalculationResult> u1, Pair<Long, CalculationResult> u2) {
            return u1.getKey().compareTo(u2.getKey());
          }
        });

    // limit chart baseline to 14 days
    results = results.subList(Math.max(0, results.size() - 14), results.size());

    val input =
        PyChartInput.builder()
            .data(results)
            .path(path)
            .columnName(metadata.getColumnName())
            .segmentText(metadata.getSegmentText())
            .metric(config.getMetric());
    val res = PyDriftChartFunctionV2.INSTANCE.apply(input.build());
    // return true if successful
    return res != null && res.getSuccess();
  }
}
