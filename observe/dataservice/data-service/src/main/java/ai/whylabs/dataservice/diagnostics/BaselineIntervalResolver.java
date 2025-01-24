package ai.whylabs.dataservice.diagnostics;

import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.predicatesV3.AbstractBaselineTimerangePredicateV3;

public class BaselineIntervalResolver extends AbstractBaselineTimerangePredicateV3 {

  public BaselineIntervalResolver(
      long targetBatchTimestamp,
      Granularity granularity,
      int lateWindowDays,
      Baseline baseline,
      int targetSize) {
    super(targetBatchTimestamp, granularity, lateWindowDays, baseline, targetSize);
  }
}
