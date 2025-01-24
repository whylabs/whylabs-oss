package ai.whylabs.druid.whylogs;

import ai.whylabs.druid.whylogs.column.ColumnProfileAggregatorFactory;
import ai.whylabs.druid.whylogs.column.ColumnProfileComplexMetricSerde;
import ai.whylabs.druid.whylogs.column.ColumnProfileJsonSerializer;
import ai.whylabs.druid.whylogs.column.ColumnProfileToStringPostAggregator;
import ai.whylabs.druid.whylogs.discrete.DiscretePostAggregator;
import ai.whylabs.druid.whylogs.frequency.FrequencBaseClassJsonSerializer;
import ai.whylabs.druid.whylogs.frequency.FrequencyAggregatorFactory;
import ai.whylabs.druid.whylogs.frequency.FrequencyComplexMetricSerde;
import ai.whylabs.druid.whylogs.frequency.FrequencyJsonSerializer;
import ai.whylabs.druid.whylogs.frequency.FrequencyToStringPostAggregator;
import ai.whylabs.druid.whylogs.frequency.StringItemSketch;
import ai.whylabs.druid.whylogs.schematracker.InferredTypeJsonSerializer;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregator;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregatorResultStructure;
import ai.whylabs.druid.whylogs.streaming.WhylogsS3NotificationInputFormat;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.annotations.VisibleForTesting;
import com.google.inject.Binder;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.whylogs.core.ColumnProfile;
import java.util.Collections;
import java.util.List;
import org.apache.druid.initialization.DruidModule;
import org.apache.druid.segment.serde.ComplexMetrics;

public class WhylogsExtensionsModule implements DruidModule {

  public static final String COLUMN_PROFILE = "columnProfile";
  public static final String COLUMN_PROFILE_AGG = "columnProfileMerge";
  public static final String FREQUENCY = "frequentItems";
  public static final String FREQUENCY_AGG = "frequentItemsMerge";
  public static final String FREQUENCY_TO_STRING = "frequentItemsMergeToString";
  public static final String DISCRETE_POST_AGG = "discrete";
  public static final String INFERRED_TYPE_POST_AGG = "inferredType";

  @VisibleForTesting
  public static void registerSerde() {
    ComplexMetrics.registerSerde(COLUMN_PROFILE, new ColumnProfileComplexMetricSerde());
    ComplexMetrics.registerSerde(FREQUENCY, new FrequencyComplexMetricSerde());
  }

  @Override
  public List<? extends Module> getJacksonModules() {
    // SUM(mean * count) / SUM(count)
    return Collections.singletonList(
        new SimpleModule("WhyLogsInputRowParserModule")
            .registerSubtypes(
                new NamedType(DiscretePostAggregator.class, DISCRETE_POST_AGG),
                new NamedType(InferredTypePostAggregator.class, INFERRED_TYPE_POST_AGG),
                new NamedType(WhylogsS3NotificationInputFormat.class, "whylogsKinesis"),
                new NamedType(ColumnProfileAggregatorFactory.class, COLUMN_PROFILE_AGG),
                new NamedType(
                    ColumnProfileToStringPostAggregator.class, "columnProfileMergeToString"),
                new NamedType(FrequencyAggregatorFactory.class, FREQUENCY_AGG),
                new NamedType(FrequencyToStringPostAggregator.class, FREQUENCY_TO_STRING))
            .addSerializer(ColumnProfile.class, new ColumnProfileJsonSerializer())
            .addSerializer(
                InferredTypePostAggregatorResultStructure.class, new InferredTypeJsonSerializer())
            .addSerializer(ItemsSketch.class, new FrequencBaseClassJsonSerializer())
            .addSerializer(StringItemSketch.class, new FrequencyJsonSerializer()));
  }

  @Override
  public void configure(Binder binder) {
    registerSerde();
  }
}
