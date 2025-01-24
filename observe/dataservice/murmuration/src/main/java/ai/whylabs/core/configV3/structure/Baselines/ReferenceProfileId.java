package ai.whylabs.core.configV3.structure.Baselines;

import ai.whylabs.core.configV3.structure.enums.Granularity;
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
public class ReferenceProfileId implements Baseline {
  // TODO: implement
  @JsonInclude(Include.NON_NULL)
  private String datasetId;

  private String profileId;

  @Override
  public Integer getExpectedBaselineDatapoints(Granularity entityGranularity) {
    return 1;
  }
}
