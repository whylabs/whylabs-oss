package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.experimental.FieldNameConstants;
import org.joda.time.Interval;

@FieldNameConstants
@Data
public class GetAdHocRunNumEventsRequest {
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, runId to search for")
  private String runId;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval
}
