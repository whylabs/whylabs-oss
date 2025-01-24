package ai.whylabs.dataservice.calculations;

import ai.whylabs.dataservice.responses.ColumnMetric;
import java.util.Map;
import java.util.Optional;
import lombok.val;

public class PostAggregators {
  // metric paths referred to (input or output) by postaggregators.
  public static final String INFERRED_TYPE_METRIC_PATH = "inferredtype";
  static final String KLL_METRIC_PATH = "distribution/kll";
  static final String FREQUENT_STRINGS_METRIC_PATH = "frequent_items/frequent_strings";
  public static final String ISDISCRETE_METRIC_PATH = "distribution/isdiscrete";
  static final String ERROR_PATH = "postaggregator/error";

  private final InferredTypePostAgg inferredAgg;
  private final KllPostAgg kllPost;
  private final DiscretePostAgg isDiscreteAgg;
  private final FrequentStringsPostAgg frequentStringsAgg;

  public PostAggregators(Integer numBins, double[] splitPoints, double[] fractions) {
    // KllPost is the only parameterized postaggregator.
    val builder = KllPostAgg.builder();
    Optional.ofNullable(numBins).map(builder::numBins);
    Optional.ofNullable(splitPoints).map(builder::splitPoints);
    Optional.ofNullable(fractions).map(builder::fractions);
    kllPost = builder.build();

    // NB order matters - isDiscreteAgg depends on results from inferredAgg
    inferredAgg = InferredTypePostAgg.builder().build();
    isDiscreteAgg = DiscretePostAgg.builder().build();
    frequentStringsAgg = FrequentStringsPostAgg.builder().build();
  }

  public Map<String, ColumnMetric> calculate(Map<String, ColumnMetric> metrics) {
    try {
      metrics = inferredAgg.calculate(metrics);
      metrics = kllPost.calculate(metrics);
      metrics = isDiscreteAgg.calculate(metrics);
      metrics = frequentStringsAgg.calculate(metrics);
    } catch (Exception e) {
      // catch and expose exceptions thrown by postaggregators
      val newrow = new ColumnMetric(ERROR_PATH + "/" + e.getClass().getName(), e.getMessage());
      metrics.put(newrow.getMetricPath(), newrow);
    }

    return metrics;
  }
}
