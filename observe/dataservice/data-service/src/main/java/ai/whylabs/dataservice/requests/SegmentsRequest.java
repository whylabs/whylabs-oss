package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.SegmentRequestScope;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class SegmentsRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetIds")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Show hidden segments")
  @Schema(required = false)
  private boolean includeHidden = false;

  @JsonPropertyDescription("Scope the segment request to timeseries or reference profiles or both")
  @Schema(required = false)
  private SegmentRequestScope scope = SegmentRequestScope.TIMESERIES;

  @JsonPropertyDescription(
      "Optional, list of key-value tags that must match for a segment to be included")
  @Schema(required = false)
  private List<SegmentTag> filter;
}
