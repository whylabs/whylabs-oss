package ai.whylabs.dataservice.requests;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.persistence.Convert;
import javax.persistence.Embeddable;
import lombok.Data;

@Data
@Embeddable
public class DeleteAnalysisRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Optional, delete analysis results with dataset timestamp at or after this value, in epoch millis")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long delete_gte;

  @JsonPropertyDescription(
      "Optional, delete analysis results with dataset timestamp earlier than this value, in epoch millis")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long delete_lt;

  @JsonPropertyDescription("Optional analyzer id filter")
  @Schema(required = false)
  private String analyzerId;
}
