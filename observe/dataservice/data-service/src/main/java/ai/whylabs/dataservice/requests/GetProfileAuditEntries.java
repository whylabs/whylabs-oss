package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.persistence.ElementCollection;
import lombok.Data;
import lombok.experimental.FieldNameConstants;
import org.joda.time.Interval;

@FieldNameConstants
@Data
public class GetProfileAuditEntries {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @ElementCollection
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription(
      "Optional, list of segment tags to match. Note, with .bin packing, in the future a file may contain many segments worth as this request hits the audit table.")
  @Schema(required = false)
  private List<SegmentTag> segment;

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  private Integer limit = 50;

  @JsonPropertyDescription("Offset as per sql definition, max 10")
  private Integer offset = 0;
}
