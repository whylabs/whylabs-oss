package ai.whylabs.dataservice.metrics.result;

import ai.whylabs.dataservice.metrics.spec.BuiltinProfileMetric;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Data;
import lombok.Singular;

@Builder
@Data
public class DataEvaluationResult {
  String segment;
  String columnName;
  BuiltinProfileMetric metric;
  String queryId;

  @Singular("addColumn")
  List<Map<String, Double>> rowColumns;
}
