package ai.whylabs.dataservice.metrics.agg;

import ai.whylabs.dataservice.metrics.postagg.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class CustomSpec implements Spec {

  @Schema(description = "Optional, if you want to override default path")
  @Nullable
  String metricPath;

  @Schema(
      description = "Required, aggregation that gets applied in our query engine",
      example = "sum_count")
  Agg aggregation;

  // optional
  @Schema(description = "Optional, apply further aggregation to results from query engine")
  @Nullable
  PostAgg postAgg; // percentile, unique_est, last, first, max, sum, min,

  @Schema(description = "Required, the metric level this aggregation is supported on")
  List<MetricAggregationLevel> supportedLevels;

  @Override
  public Agg getAgg() {
    return aggregation;
  }
}
