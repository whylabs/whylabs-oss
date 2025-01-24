package ai.whylabs.dataservice.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode
public class TraceDetailRequest {

  @Schema(example = "org-123")
  String orgId;

  @Schema(example = "model-1")
  String resourceId;

  @Schema(example = "b45ff47b0a805450ecbba90d46c9a3f4")
  String traceId;

  @Schema(description = "Sort by start time. Default is descending")
  Boolean asc;
}
