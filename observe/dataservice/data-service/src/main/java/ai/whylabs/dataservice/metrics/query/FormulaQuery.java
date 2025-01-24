package ai.whylabs.dataservice.metrics.query;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class FormulaQuery extends MetricQuery {
  @Schema(example = "(a+b)/c", description = "Formula to evaluate (could just be a single metric)")
  String formula;

  @JsonIgnore Boolean prefixResults = false;

  @Override
  public void validate() {
    super.validate();
  }
}
