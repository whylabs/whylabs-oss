package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class PurgeDeletedDatasetsRequest {

  private Boolean dryRun;

  @JsonPropertyDescription("S3 location to a dump of the dynamodb songbird metadata table")
  @Schema(required = true, type = "string")
  private String s3Path;
}
