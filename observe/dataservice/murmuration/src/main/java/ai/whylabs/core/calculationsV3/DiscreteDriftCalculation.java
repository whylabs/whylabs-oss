package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.calculations.math.Distance;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.DriftCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class DiscreteDriftCalculation extends DriftCalculation<ItemsSketch<String>> {

  public DiscreteDriftCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      DriftConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents, config);
  }

  @Override
  public DriftCalculationResult calculate(
      List<Pair<Long, ItemsSketch<String>>> baseline,
      List<Pair<Long, ItemsSketch<String>>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // This calculation expects `baseline` to be rolled up into a single time point.
    if (baseline.size() != 1) {
      log.warn("DiscreteDriftCalculation expected baseline to have length 1");
      return null; // TODO: is this the right thing to do?
    }
    val sketch1 = baseline.get(0).getValue();
    val sketch2 = target.get(0).getValue();
    double distance = 0.0;
    if (sketch1 != null && sketch2 != null) {
      distance = Distance.discrete(config.getAlgorithm(), sketch1, sketch2);
    }
    val builder =
        DriftCalculationResult.builder()
            .metricValue(distance)
            .threshold(config.getThreshold())
            .alertCount(distance > config.getThreshold() ? 1L : 0L);
    return builder.build();
  }
}
