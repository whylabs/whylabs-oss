package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class NumericMetricsForSegmentKeyRequest {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, segment key for grouping, aggregating")
  @Schema(required = true)
  private String segmentKey;

  @JsonPropertyDescription(
      "Required, return metrics greater over this interval.  Interval is inclusive on the left, exclusive on the right.")
  @Schema(required = true)
  private String interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Required, list of datasets column names to search for")
  private List<DatasetAndColumn> datasetColumnSelectors;
}
