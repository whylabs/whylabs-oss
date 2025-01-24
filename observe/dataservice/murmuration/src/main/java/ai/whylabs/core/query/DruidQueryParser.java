package ai.whylabs.core.query;

import ai.whylabs.druid.whylogs.WhylogsExtensionsModule;
import ai.whylabs.druid.whylogs.discrete.DiscretePostAggregator;
import ai.whylabs.druid.whylogs.frequency.FrequencyAggregatorFactory;
import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import ai.whylabs.druid.whylogs.frequency.FrequencyToStringPostAggregator;
import ai.whylabs.druid.whylogs.frequency.StringItemSketch;
import ai.whylabs.druid.whylogs.hll.HllSketchMergeAggregatorFactory;
import ai.whylabs.druid.whylogs.hll.HllSketchModule;
import ai.whylabs.druid.whylogs.hll.HllSketchToEstimatePostAggregator;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchAggregatorFactory;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchModule;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchToHistogramPostAggregator;
import ai.whylabs.druid.whylogs.modelmetrics.DerivedMetricsPostAggregator;
import ai.whylabs.druid.whylogs.modelmetrics.DruidModelMetrics;
import ai.whylabs.druid.whylogs.modelmetrics.ModelMetricModule;
import ai.whylabs.druid.whylogs.modelmetrics.Operations;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.aggregation.post.FieldAccessPostAggregator;

/** Extract Aggregators, PostAggregators, Dimensions, etc from a druid json query */
public class DruidQueryParser {

  private static final ObjectMapper MAPPER;

  static {
    MAPPER = new ObjectMapper();
    val sm = new SimpleModule();
    sm.addDeserializer(PostAggregator.class, new FieldPostAggregatorJsonDeserializer());
    MAPPER.registerModule(sm);

    MAPPER.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    MAPPER.registerModules(new WhylogsExtensionsModule().getJacksonModules());
  }

  @Getter private final String query;

  private List<PostAggregator> postAggregators = null;
  private List<AggregatorFactory> sketchAggregators = null;
  private List<String> dimensions = null;

  public static Set<String> SketchAggregators =
      ImmutableSet.of(
          WhylogsExtensionsModule.FREQUENCY_AGG,
          ModelMetricModule.MODEL_METRIC_AGG,
          KllDoublesSketchModule.KLL_SKETCH,
          HllSketchModule.MERGE_TYPE_NAME);

  public DruidQueryParser(String query) {
    this.query = query;
  }

  public Function<Object, byte[]> getSketchSerializer(AggregatorFactory aggregatorFactory) {
    if (aggregatorFactory instanceof FrequencyAggregatorFactory) {
      return itemsSketch -> {
        if (itemsSketch instanceof ItemsSketch) {
          //noinspection unchecked
          return FrequencyOperations.serialize((ItemsSketch<String>) itemsSketch);
        } else if (itemsSketch instanceof StringItemSketch) {
          return FrequencyOperations.serialize((StringItemSketch) itemsSketch);
        }
        throw new IllegalArgumentException("Unable to serialize class " + itemsSketch.getClass());
      };
    }

    if (aggregatorFactory instanceof KllDoublesSketchAggregatorFactory) {
      return kll -> ((KllDoublesSketch) kll).toByteArray();
    }

    if (aggregatorFactory instanceof HllSketchMergeAggregatorFactory) {
      return hllSketch -> ((HllSketch) hllSketch).toUpdatableByteArray();
    }

    if (aggregatorFactory instanceof ai.whylabs.druid.whylogs.modelmetrics.AggregatorFactory) {
      // the type of `metric` is determined by the return type of
      // `AggregatorFactory.finalizeComputation()`
      return metrics -> Operations.serialize((DruidModelMetrics) metrics);
    }

    throw new UnsupportedOperationException(
        "Serializer not found for class " + aggregatorFactory.getClass().getName());
  }

  @SneakyThrows
  private AggregatorFactory getSketchAggregator(JsonNode jsonNode) {
    String type = jsonNode.get("type").asText();
    String aggregatorConfigJson = jsonNode.toString();

    // TODO: It'd be cool if this could auto-register from the druid module class
    switch (type) {
      case WhylogsExtensionsModule.FREQUENCY_AGG:
        return MAPPER.readValue(aggregatorConfigJson, FrequencyAggregatorFactory.class);
      case KllDoublesSketchModule.KLL_SKETCH:
        return MAPPER.readValue(aggregatorConfigJson, KllDoublesSketchAggregatorFactory.class);
      case HllSketchModule.MERGE_TYPE_NAME:
        return MAPPER.readValue(aggregatorConfigJson, HllSketchMergeAggregatorFactory.class);
      case ModelMetricModule.MODEL_METRIC_AGG:
        return MAPPER.readValue(
            aggregatorConfigJson, ai.whylabs.druid.whylogs.modelmetrics.AggregatorFactory.class);
      default:
        throw new UnsupportedOperationException("AggregatorFactory not bound for type " + type);
    }
  }

  @SneakyThrows
  public List<AggregatorFactory> getSketchAggregators() {
    if (sketchAggregators == null) {
      sketchAggregators = new ArrayList<>();
      for (JsonNode aggregatorJsonNode : MAPPER.readTree(query).get("aggregations")) {
        String type = aggregatorJsonNode.get("type").asText();
        if (!SketchAggregators.contains(type)) {
          continue;
        }

        sketchAggregators.add(getSketchAggregator(aggregatorJsonNode));
      }
    }

    return sketchAggregators;
  }

  static class FieldPostAggregatorJsonDeserializer extends JsonDeserializer<PostAggregator> {
    @Override
    public PostAggregator deserialize(JsonParser p, DeserializationContext ctxt)
        throws IOException {
      ObjectCodec oc = p.getCodec();
      JsonNode node = oc.readTree(p);
      String type = node.get("type").asText();

      switch (type) {
        case "fieldAccess":
          return new FieldAccessPostAggregator(
              node.get("name").asText(), node.get("fieldName").asText());
        case WhylogsExtensionsModule.FREQUENCY_TO_STRING:
          return MAPPER.readerFor(FrequencyToStringPostAggregator.class).readValue(node);
        case KllDoublesSketchModule.KLL_SKETCH_HISTOGRAM_POST_AGG:
          return MAPPER.readerFor(KllDoublesSketchToHistogramPostAggregator.class).readValue(node);
        case WhylogsExtensionsModule.DISCRETE_POST_AGG:
          return MAPPER.readerFor(DiscretePostAggregator.class).readValue(node);
        case WhylogsExtensionsModule.INFERRED_TYPE_POST_AGG:
          return MAPPER.readerFor(InferredTypePostAggregator.class).readValue(node);
        case HllSketchModule.ESTIMATE_TYPE_NAME:
          return MAPPER.readerFor(HllSketchToEstimatePostAggregator.class).readValue(node);
        case ModelMetricModule.DERIVED_POST_AGG:
          return MAPPER.readerFor(DerivedMetricsPostAggregator.class).readValue(node);
        default:
          throw new UnsupportedOperationException("Type not bound");
      }
    }
  }

  @SneakyThrows
  public List<PostAggregator> getPostAggregator() {
    if (postAggregators == null) {
      String j = MAPPER.readTree(query).get("postAggregations").toString();
      postAggregators =
          MAPPER.readValue(
              j, MAPPER.getTypeFactory().constructCollectionType(List.class, PostAggregator.class));
    }

    return postAggregators;
  }

  @SneakyThrows
  public List<String> getGroupingDimensions() {
    if (dimensions == null) {
      dimensions = new ArrayList<>();
      JsonNode tree = MAPPER.readTree(query);
      for (JsonNode postAggregatorJsonNode : tree.get("dimensions")) {
        dimensions.add(postAggregatorJsonNode.textValue());
      }
    }

    return ImmutableList.sortedCopyOf(dimensions);
  }
}
