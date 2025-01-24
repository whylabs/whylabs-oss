package ai.whylabs.dataservice.metrics.spec;

import java.util.List;

public interface BuiltinMetric {

  List<NumericMetric> getMetrics();

  String getFormula();
}
