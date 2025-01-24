package ai.whylabs.dataservice.metrics.result;

import ai.whylabs.dataservice.metrics.spec.BuiltinProfileMetric;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode
public class EvaluationCellResult {
  String segment;
  String columnName;
  BuiltinProfileMetric metric;
  Double value;
  String id;
  String queryId;
}
