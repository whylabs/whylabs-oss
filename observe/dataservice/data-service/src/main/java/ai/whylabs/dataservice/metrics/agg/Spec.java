package ai.whylabs.dataservice.metrics.agg;

import ai.whylabs.dataservice.metrics.postagg.PostAgg;
import java.util.List;

public interface Spec {

  default String getName() {
    return null;
  }

  String getMetricPath();

  Agg getAgg();

  PostAgg getPostAgg();

  List<MetricAggregationLevel> getSupportedLevels();
}
