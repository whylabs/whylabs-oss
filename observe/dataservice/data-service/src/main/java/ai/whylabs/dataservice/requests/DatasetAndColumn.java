package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.persistence.ElementCollection;
import lombok.Data;
import lombok.NonNull;

/**
 * Part of numeric metric REST queries, producing results used in tracing. This class specifies
 * which metric is to be applied to an optional list of features (`columnNames`). If `columnNames`
 * is unspecified, metric will be applied to all features.
 */
@Data
public class DatasetAndColumn {
  @JsonPropertyDescription("Required")
  @NonNull
  @Schema(required = true)
  private final String datasetId;

  @JsonPropertyDescription("Optional, feature name, not included for dataset metrics")
  @ElementCollection
  @Schema(required = false)
  private final List<String> columnNames;

  @JsonPropertyDescription(
      "Required, AnalysisMetric enum, chooses which monitor metric we want to calculate")
  @Schema(required = true)
  private final String metric;
}
