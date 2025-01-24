package ai.whylabs.dataservice.metrics.agg;

import ai.whylabs.dataservice.metrics.postagg.PostAgg;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class CustomMonitorSpec extends CustomSpec {

  @Schema(
      description = "Required, aggregation that gets applied in our query engine",
      example = "sum_count")
  MonitorAgg aggregation;

  // optional
  @Schema(description = "Optional, apply further aggregation to results from query engine")
  @Nullable
  PostAgg postAgg; // percentile, unique_est, last, first, max, sum, min,

  @Override
  public Agg getAgg() {
    return aggregation;
  }
}
