package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.calculations.math.Distance;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.DriftCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class ContinuousDriftCalculation extends DriftCalculation<KllDoublesSketch> {

  public ContinuousDriftCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      DriftConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents, config);
  }

  @Override
  public DriftCalculationResult calculate(
      List<Pair<Long, KllDoublesSketch>> baseline,
      List<Pair<Long, KllDoublesSketch>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // This calculation expects `baseline` to be rolled up into a single time point.
    if (baseline.size() != 1) {
      // In theory ValidateContinousDriftSingleBaselineBucket should prevent this scenario upstream
      // before the calculation runs
      log.warn("ContinuousDriftCalculation expected baseline to have length 1");
      return null; // TODO: is this the right thing to do?
    }
    val h1 = baseline.get(0).getValue();
    val h2 = target.get(0).getValue();
    double d = 0.0;
    if (h1 != null && h2 != null) {
      d = Distance.continuous(config.getAlgorithm(), h1, h2);
    }
    val builder =
        DriftCalculationResult.builder()
            .metricValue(d)
            .threshold(config.getThreshold())
            .alertCount(d > config.getThreshold() ? 1L : 0L);
    return builder.build();
  }
}
