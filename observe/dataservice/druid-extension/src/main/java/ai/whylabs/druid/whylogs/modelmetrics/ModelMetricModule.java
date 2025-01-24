package ai.whylabs.druid.whylogs.modelmetrics;

import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.annotations.VisibleForTesting;
import com.google.inject.Binder;
import java.util.Collections;
import java.util.List;
import org.apache.druid.initialization.DruidModule;
import org.apache.druid.segment.serde.ComplexMetrics;

public class ModelMetricModule implements DruidModule {

  public static final String MODEL_METRIC_AGG = "ModelMetricsMerge";
  public static final String SUMMARY_POST_AGG = "classification.summary";
  public static final String DERIVED_POST_AGG = "derived.metrics";

  @Override
  public void configure(final Binder binder) {
    registerSerde();
  }

  @Override
  public List<? extends com.fasterxml.jackson.databind.Module> getJacksonModules() {
    return Collections.<com.fasterxml.jackson.databind.Module>singletonList(
        new SimpleModule("ModelMetricsModule")
            .registerSubtypes(
                new NamedType(AggregatorFactory.class, MODEL_METRIC_AGG),
                new NamedType(ClassificationSummaryPostAggregator.class, SUMMARY_POST_AGG),
                new NamedType(DerivedMetricsPostAggregator.class, DERIVED_POST_AGG))
            .addSerializer(DruidModelMetrics.class, new DruidModelMetricsJsonSerializer())
            .addSerializer(ClassificationSummary.class, new ClassificationSummaryJsonSerializer()));
  }

  @VisibleForTesting
  public static void registerSerde() {
    ComplexMetrics.registerSerde(DatasetMetrics.MODEL_METRICS, new ComplexMetricSerde());
  }
}
