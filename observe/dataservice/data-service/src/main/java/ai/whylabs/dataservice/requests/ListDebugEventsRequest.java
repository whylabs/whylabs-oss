package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import lombok.experimental.FieldNameConstants;
import org.joda.time.Interval;

@FieldNameConstants
@Data
public class ListDebugEventsRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to associate with the debug event")
  @Schema(required = false)
  private List<List<SegmentTag>> segmentTags;

  @JsonPropertyDescription("Optional filter by trace id")
  @Schema(required = false)
  private String traceId;

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  @Schema(
      type = "integer",
      minimum = "1",
      maximum = "" + ValidateRequest.MAX_PAGE_SIZE,
      defaultValue = "50")
  private Integer limit = 50;

  @JsonPropertyDescription("Offset as per sql definition, max " + ValidateRequest.MAX_OFFSET)
  @Schema(
      type = "integer",
      minimum = "0",
      maximum = "" + ValidateRequest.MAX_OFFSET,
      defaultValue = "0")
  private Integer offset = 0;
}
