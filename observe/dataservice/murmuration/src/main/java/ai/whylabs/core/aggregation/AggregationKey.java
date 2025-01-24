package ai.whylabs.core.aggregation;

import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Exploded row collectors can be configured to aggregate differently. Whether that's a different
 * baseline config or target rollups are disabled, we'll instantiate a unique ExplodedRowCollector
 * for each unique combination of parameters.
 */
@EqualsAndHashCode
@Builder
@Data
public class AggregationKey {
  Baseline baseline;
  Integer targetSize;
  TargetLevel targetLevel;
  String targetProfileId;
  Boolean disableTargetRollup;
}
