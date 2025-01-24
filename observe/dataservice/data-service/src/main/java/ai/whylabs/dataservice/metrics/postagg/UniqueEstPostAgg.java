package ai.whylabs.dataservice.metrics.postagg;

import com.fasterxml.jackson.annotation.JsonTypeName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonTypeName(PostAggConstants.UNIQUE_EST)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UniqueEstPostAgg implements PostAgg {
  @Schema(
      minimum = "1",
      example = "1",
      defaultValue = "1",
      description = "Number of standard deviations. Default to 1")
  int numStddevs = 1;

  @Schema(minimum = "1", maximum = "3", example = "1")
  int position;

  @Override
  public String toSql() {
    return String.format(
        "(hll_sketch_get_estimate_and_bounds(agg_data, %s)::DOUBLE PRECISION[])[%d]",
        numStddevs, position);
  }
}
