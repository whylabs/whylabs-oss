package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.persistence.ElementCollection;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReferenceProfileRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required, referenceProfileId")
  @Schema(required = true)
  private String referenceProfileId;

  @JsonPropertyDescription("Optional list of column names to search for")
  @ElementCollection
  @Schema(required = true)
  private List<String> columnNames;

  @JsonPropertyDescription(
      "Optional Fractions for kll quantiles. Defaults to {0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1}")
  @Schema(required = false)
  private List<Double> fractions;

  @JsonPropertyDescription(
      "Optional number of bins for kll histogram.  Mutually exclusive with `splitPoints`. Defaults to 30 if `splitPoints` not set.")
  @Schema(required = false)
  private Integer numBins;

  @JsonPropertyDescription(
      "Optional Split points for kll histogram.  Values must be unique and monotonically increasing. Mutually exclusive with `numBins`. ")
  @Schema(required = false)
  private List<Double> splitPoints;

  @JsonPropertyDescription("Optional, list of segment tags to match")
  @Schema(required = false)
  private List<SegmentTag> segment;
}
