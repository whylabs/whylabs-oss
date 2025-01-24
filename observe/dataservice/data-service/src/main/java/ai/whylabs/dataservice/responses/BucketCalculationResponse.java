package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class BucketCalculationResponse {
  @JsonPropertyDescription("Start of bucket boundary")
  private Long start;

  @JsonPropertyDescription("End of bucket boundary")
  private Long end;
}
