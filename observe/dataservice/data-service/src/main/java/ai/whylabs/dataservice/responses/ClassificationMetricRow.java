package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import lombok.AllArgsConstructor;
import lombok.Data;

// Thin-veneer wrapper to package ClassificationMetricValues with a timestamp to create a single
// seamless object for return from REST api.
@Data
@AllArgsConstructor
public class ClassificationMetricRow {
  private final Long timestamp;

  @JsonUnwrapped private ClassificationMetricValues metrics;
}
