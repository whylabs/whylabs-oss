package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.requests.Segment;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import org.joda.time.Interval;

@Schema(
    description = "List the monitors for a given dataset and time range and segment (exact match)")
public class ListMonitorResponse {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  protected String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  protected String datasetId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription(
      "Segment to match. If null , we will match against all segments. If empty, we will match against the overall segment")
  @Schema(required = false)
  private Segment segment;

  @JsonPropertyDescription("The metric that we ran the monitor against")
  @Schema(required = true)
  private String targetMetric;

  @JsonPropertyDescription(
      "The column whose metric we are checking against. If not specified, we filter to just dataset level metric")
  private String targetColumn;
}
