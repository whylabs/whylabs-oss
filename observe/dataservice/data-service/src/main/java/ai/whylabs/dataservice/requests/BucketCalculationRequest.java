package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class BucketCalculationRequest {
  @Schema(required = true)
  private Long ts;

  @Schema(required = true)
  private DataGranularity granularity;
}
