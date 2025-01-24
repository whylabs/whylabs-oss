package ai.whylabs.dataservice.requests;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.persistence.Convert;
import javax.persistence.Embeddable;
import lombok.Data;

@Data
@Embeddable
public class DeleteProfileRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Optional, scope deleting profiles more recently than ts")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long delete_gte;

  @JsonPropertyDescription("Optional, scope deleting profiles older than ts")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long delete_lt;

  @JsonPropertyDescription("Optional, scope deleting profiles uploaded to whylabs prior to ts")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long beforeUploadTs;

  @JsonPropertyDescription("Optional, scope the deletion to a single column")
  @Schema(required = false)
  private String columnName;

  @JsonPropertyDescription(
      "Optional, after deleting data re-ingest the data from .bin profiles. This is useful for repairing a bug or re-ingesting deleted data.")
  @Schema(required = false)
  private Boolean reingestAfterDeletion = false;
}
