package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GetLatestAnomalyResponse {
  @JsonPropertyDescription("Unix ts in millis of the latest dataset timestamp")
  private Long latest;

  private String datasetId;
}
