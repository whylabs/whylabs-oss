package ai.whylabs.druid.whylogs.kll;

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.annotations.VisibleForTesting;
import com.google.inject.Binder;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.util.Collections;
import java.util.List;
import org.apache.druid.initialization.DruidModule;
import org.apache.druid.segment.serde.ComplexMetrics;

public class KllDoublesSketchModule implements DruidModule {

  public static final String KLL_SKETCH = "kllFloatsSketch";
  public static final String KLL_SKETCH_HISTOGRAM_POST_AGG = "kllFloatsSketchToHistogram";
  public static final String KLL_SKETCH_BASE64_POST_AGG = "kllFloatsSketchToBase64";

  @Override
  public void configure(final Binder binder) {
    registerSerde();
  }

  @Override
  public List<? extends Module> getJacksonModules() {
    return Collections.<Module>singletonList(
        new SimpleModule("KllDoublesSketchModule")
            .registerSubtypes(
                new NamedType(KllDoublesSketchAggregatorFactory.class, KLL_SKETCH),
                new NamedType(
                    KllDoublesSketchToHistogramPostAggregator.class, KLL_SKETCH_HISTOGRAM_POST_AGG),
                new NamedType(
                    KllDoublesSketchToBase64PostAggregator.class, KLL_SKETCH_BASE64_POST_AGG))
            .addSerializer(KllDoublesSketch.class, new KllDoublesSketchJsonSerializer()));
  }

  @VisibleForTesting
  public static void registerSerde() {
    ComplexMetrics.registerSerde(KLL_SKETCH, new KllDoublesSketchComplexMetricSerde());
  }
}
