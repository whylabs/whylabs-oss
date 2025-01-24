package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class GetAnomalyCountsResult {
  @JsonPropertyDescription("Unix ts of the grouped bucket rolled up by the query granularity")
  private Long ts;

  private String datasetId;
  private Long anomalies;
  private Long failures;
  private Long overall;
}
