package ai.whylabs.core.configV3.structure.Baselines;

import ai.whylabs.core.configV3.structure.CronSchedule;
import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;
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
public class TrailingWindowBaseline implements Baseline {
  // TODO: implement
  @JsonInclude(Include.NON_NULL)
  private String datasetId;

  // Window size, num batches
  @JsonInclude(Include.NON_NULL)
  private Integer size = 7;

  /**
   * TODO: Implement Offset from the current batch for the range of the trailing window. Default to
   * 1 (the previous batch). This means that if set this to 0, the baseline will include the current
   * batch's value, or if we set it to 7, then the window is off by 7.
   */
  @JsonInclude(Include.NON_NULL)
  private Integer offset;

  @JsonInclude(Include.NON_NULL)
  private List<TimeRange> exclusionRanges;

  /** Motivation here is to make it easy to exclude weekends from being included in a baseline */
  @JsonInclude(Include.NON_NULL)
  private CronSchedule exclusionSchedule;

  @Override
  public Integer getExpectedBaselineDatapoints(Granularity entityGranularity) {
    return size;
  }
}
