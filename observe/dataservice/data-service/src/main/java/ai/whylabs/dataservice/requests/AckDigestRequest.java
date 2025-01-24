package ai.whylabs.dataservice.requests;

import static java.util.Objects.nonNull;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.persistence.ElementCollection;
import lombok.Builder;
import lombok.Data;
import org.apache.logging.log4j.util.Strings;
import org.joda.time.DateTime;

@Data
@Builder
public class AckDigestRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @ElementCollection
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Acknowledge digests sent for this monitor ID")
  @Schema(required = true)
  private String monitorId;

  @JsonPropertyDescription("Acknowledge digests sent for this run ID")
  @Schema(required = true)
  private String runId;

  @JsonPropertyDescription("Timestamp when Siren send the notification.")
  @Schema(required = true)
  private DateTime sentTimestamp; //  ISO 8601 formatted datetime, e.g.

  public boolean validate() {
    // all fields must be set in order for this to be a valid request.
    return Strings.isNotEmpty(orgId)
        && Strings.isNotEmpty(datasetId)
        && Strings.isNotEmpty(runId)
        && Strings.isNotEmpty(monitorId)
        && nonNull(sentTimestamp);
  }
}
