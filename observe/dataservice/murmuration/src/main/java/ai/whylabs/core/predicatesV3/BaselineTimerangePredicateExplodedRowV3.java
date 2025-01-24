package ai.whylabs.core.predicatesV3;

import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.structures.ExplodedRow;
import java.util.function.Predicate;

public class BaselineTimerangePredicateExplodedRowV3 extends AbstractBaselineTimerangePredicateV3
    implements Predicate<ExplodedRow> {

  public BaselineTimerangePredicateExplodedRowV3(
      long targetBatchTimestamp,
      Granularity granularity,
      int lateWindowDays,
      Baseline baseline,
      int targetSize) {
    super(targetBatchTimestamp, granularity, lateWindowDays, baseline, targetSize);
  }

  @Override
  public boolean test(ExplodedRow explodedRow) {

    return test(
        explodedRow.getTs(),
        explodedRow.getProfileId(),
        explodedRow.getOrgId(),
        explodedRow.getDatasetId());
  }
}
