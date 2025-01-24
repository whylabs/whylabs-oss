package ai.whylabs.core.configV3.structure.Baselines;

import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.TrailingWindowCalculator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class TimeRangeBaseline implements Baseline {

  // TODO: Implement
  @JsonInclude(Include.NON_NULL)
  private String datasetId;

  private TimeRange range;

  @Override
  public Integer getExpectedBaselineDatapoints(Granularity entityGranularity) {
    Long l = TrailingWindowCalculator.getNumBucketsBetween(entityGranularity, range);
    return l == null ? null : l.intValue();
  }
}
