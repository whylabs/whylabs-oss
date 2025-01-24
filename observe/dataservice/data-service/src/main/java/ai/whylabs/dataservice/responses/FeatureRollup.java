package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.util.Map;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * Container for feature-level metrics. A key axiom of this container is that there is at-most-one
 * of each type of metric path in the collection, and all metrics in this contains are for the same
 * timestamp and feature name.
 */
@Data
@Slf4j
@JsonSerialize(using = FeatureRollupSerializer.class)
public class FeatureRollup {
  // a map of metric_path to ColumnMetric rows
  //  {
  //      "distribution/kll/quantiles": { quantiles: [0,1,5,25.400000000000002]}, ... }
  //      "types/fractional": { longs: 3315, ... }
  //  }
  Map<String, ColumnMetric> metrics;

  // Construct FeatureRollup from map of metric_path to ColumnMetric.
  // This map should contain metrics from one feature at a single timepoint.
  public FeatureRollup(Map<String, ColumnMetric> m) {
    metrics = m;
  }
}
