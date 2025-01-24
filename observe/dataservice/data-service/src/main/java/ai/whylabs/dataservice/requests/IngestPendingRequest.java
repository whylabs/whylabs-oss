package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class IngestPendingRequest {
  @JsonPropertyDescription("Optional, ingest `count` or fewer pending profiles.  Defaults to 10.")
  @Schema(required = false)
  int count = 100;
}
