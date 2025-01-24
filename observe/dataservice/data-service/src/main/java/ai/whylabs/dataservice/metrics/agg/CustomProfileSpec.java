package ai.whylabs.dataservice.metrics.agg;

import ai.whylabs.dataservice.metrics.postagg.PostAgg;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class CustomProfileSpec extends CustomSpec {

  @Schema(description = "Optional, override default path implicitly specified in `aggregation`")
  @Nullable
  String metricPath;

  @Schema(
      required = true,
      description = "Required, aggregation that gets applied in our query engine",
      example = "sum_count")
  BuiltInProfileAgg aggregation;

  // optional
  @Schema(description = "Optional, apply further aggregation to results from query engine")
  @Nullable
  PostAgg postAgg; // percentile, unique_est, last, first, max, sum, min,

  @Schema(
      required = true,
      description = "Required, the metric level this aggregation is supported on")
  List<MetricAggregationLevel> supportedLevels;

  @Override
  public Agg getAgg() {
    return aggregation;
  }
}
