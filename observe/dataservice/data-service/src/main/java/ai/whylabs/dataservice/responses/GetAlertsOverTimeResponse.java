package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetAlertsOverTimeResponse {
  @JsonPropertyDescription("Unix ts of the grouped bucket rolled up by the query granularity")
  private Long ts;

  private String datasetId;
  private Long anomalies;
  private String columnName;
  private String metric;
}
