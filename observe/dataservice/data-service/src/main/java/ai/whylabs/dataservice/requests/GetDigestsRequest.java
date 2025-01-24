package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.persistence.ElementCollection;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.joda.time.Interval;

/**
 * Request to fetch record of digests created for past analyzer runs.
 *
 * <p>Note the digest tables will age-out older results, so older records may not exist.
 */
@Data
@Builder
@ToString
public class GetDigestsRequest {
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @ElementCollection
  @Schema(required = true)
  private String datasetId;

  @ElementCollection private String analyzerId;
  @ElementCollection private String runId;

  @JsonPropertyDescription("Filter by monitor ids")
  @ElementCollection
  private String monitorId;

  @JsonPropertyDescription(
      "Required, return digests created within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval
}
