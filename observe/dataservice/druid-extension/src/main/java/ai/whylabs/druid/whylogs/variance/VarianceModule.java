package ai.whylabs.druid.whylogs.variance;

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.annotations.VisibleForTesting;
import com.google.inject.Binder;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import java.util.Collections;
import java.util.List;
import org.apache.druid.initialization.DruidModule;
import org.apache.druid.segment.serde.ComplexMetrics;

public class VarianceModule implements DruidModule {

  public static final String TYPE_NAME =
      "VarianceTracker"; // common type name to be associated with segment data
  public static final String MERGE_TYPE_NAME = "VarianceMerge";

  @Override
  public void configure(final Binder binder) {
    registerSerde();
  }

  @Override
  public List<? extends Module> getJacksonModules() {
    return Collections.<Module>singletonList(
        new SimpleModule("VarianceTrackerModule")
            .registerSubtypes(
                new NamedType(MergeAggregatorFactory.class, MERGE_TYPE_NAME),
                new NamedType(MergeAggregatorFactory.class, TYPE_NAME))
            .addSerializer(VarianceTracker.class, new VarianceJsonSerializer()));
  }

  @VisibleForTesting
  public static void registerSerde() {
    ComplexMetrics.registerSerde(TYPE_NAME, new VarianceComplexMetricSerde());
  }
}
