package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.SortOrder;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.joda.time.Interval;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelMetricsRqst {
  @JsonPropertyDescription("Match metrics from this organization ID.")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Match metrics from this model name.")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Required ISO-8601 time interval; inclusive on the left, exclusive on the right.\ne.g. \"2023-01-28T00:00:00Z/2023-01-29T00:00:00Z\" or \"2023-01-28T00:00:00Z/P2D\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to match")
  @Schema(required = false)
  private List<SegmentTag> segment;

  @JsonPropertyDescription(
      "granularity defaults to 'daily', but may also be \"weekly\", \"hourly\", \"monthly\"")
  @Schema(required = false)
  @Builder.Default
  private DataGranularity granularity = DataGranularity.daily;

  @Schema(required = false, hidden = true)
  private String segmentKey;

  @Schema(required = false)
  @JsonPropertyDescription("Order, (desc, asc). Default asc")
  @Builder.Default
  private SortOrder order = SortOrder.asc;
}
