package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import org.joda.time.Interval;

@Data
public class NumericMetricByProfile {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Match metrics from this model name.")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required feature name")
  @Schema(required = true)
  private final String columnName;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to match")
  private List<SegmentTag> segment;

  @JsonPropertyDescription("Optional filter by trace id")
  private String traceId;

  @JsonPropertyDescription(
      "Required, AnalysisMetric enum, chooses which monitor metric we want to calculate")
  @Schema(required = true)
  private final String metric;
}
