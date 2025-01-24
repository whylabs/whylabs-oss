package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.experimental.FieldNameConstants;

@Builder
@FieldNameConstants
public class TimeSeriesProfileResponse {
  public Long ts;
}
