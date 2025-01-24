package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class NumericMetricByReference {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Match metrics from this model name.")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required feature name")
  @Schema(required = true)
  private final String columnName;

  @JsonPropertyDescription("list of reference profile ids")
  @Schema(required = true)
  private String referenceId;

  @JsonPropertyDescription("Optional, list of segment tags to match")
  private List<SegmentTag> segment;

  @JsonPropertyDescription(
      "Required, AnalysisMetric enum, chooses which monitor metric we want to calculate")
  @Schema(required = true)
  private final String metric;
}
