package ai.whylabs.dataservice.metrics.postagg;

import com.fasterxml.jackson.annotation.JsonTypeName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@JsonTypeName(PostAggConstants.QUANTILE)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuantilePostAgg implements PostAgg {
  @Schema(minimum = "0", maximum = "1", example = "0.5")
  double rank;

  @Override
  public String toSql() {
    return String.format("kll_double_sketch_get_quantile(agg_data, %s)", rank);
  }
}
