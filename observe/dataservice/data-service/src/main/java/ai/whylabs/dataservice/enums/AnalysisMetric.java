package ai.whylabs.dataservice.enums;

import static java.util.Objects.isNull;

import ai.whylabs.dataservice.calculations.KllPostAgg;
import ai.whylabs.dataservice.responses.ColumnMetric;
import ai.whylabs.dataservice.services.ClassificationMetrics;
import ai.whylabs.dataservice.services.RegressionMetrics;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import lombok.val;

public enum AnalysisMetric {
  count(
      metrics ->
          Optional.ofNullable(metrics.get("counts/n"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  median(metrics -> AnalysisMetric.asQuantile(metrics, 0.50)),
  min(
      metrics ->
          Optional.ofNullable(metrics.get("distribution/kll/min"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  max(
      metrics ->
          Optional.ofNullable(metrics.get("distribution/kll/max"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  mean(
      metrics ->
          Optional.ofNullable(metrics.get("distribution/mean"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  stddev(
      metrics ->
          Optional.ofNullable(metrics.get("distribution/stddev"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  unique_upper(
      metrics ->
          Optional.ofNullable(metrics.get("cardinality/upper_1"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  unique_upper_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("cardinality/upper_1"))
                .map(ColumnMetric::getDoubles)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  unique_est( // cardinality/est
      metrics ->
          Optional.ofNullable(metrics.get("cardinality/est"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  unique_est_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("cardinality/est"))
                .map(ColumnMetric::getDoubles)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  unique_lower(
      metrics ->
          Optional.ofNullable(metrics.get("cardinality/lower_1"))
              .map(m -> m.getDoubles())
              .orElse(null)),
  unique_lower_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("cardinality/lower_1"))
                .map(ColumnMetric::getDoubles)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),

  count_bool(
      metrics ->
          Optional.ofNullable(metrics.get("types/boolean"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  count_bool_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("types/boolean"))
                .map(ColumnMetric::getLongs)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  count_integral(
      metrics ->
          Optional.ofNullable(metrics.get("types/integral"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  count_integral_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("types/integral"))
                .map(ColumnMetric::getLongs)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  count_fractional(
      metrics ->
          Optional.ofNullable(metrics.get("types/fractional"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  count_fractional_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("types/fractional"))
                .map(ColumnMetric::getLongs)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  count_string(
      metrics ->
          Optional.ofNullable(metrics.get("types/string"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  count_string_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("types/string"))
                .map(ColumnMetric::getLongs)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  count_null(
      metrics ->
          Optional.ofNullable(metrics.get("counts/null"))
              .map(m -> (double) m.getLongs())
              .orElse(null)),
  count_null_ratio(
      metrics -> {
        val numerator =
            Optional.ofNullable(metrics.get("counts/null"))
                .map(ColumnMetric::getLongs)
                .orElse(null);
        val denominator =
            Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
        if (numerator != null && denominator != null && denominator > 0) {
          return Double.valueOf(numerator / denominator);
        }
        return null;
      }),
  quantile_75(metrics -> AnalysisMetric.asQuantile(metrics, 0.75)),
  quantile_25(
      // Map<String, ColumnMetric> -> Double
      metrics -> AnalysisMetric.asQuantile(metrics, 0.25)),
  quantile_90(metrics -> AnalysisMetric.asQuantile(metrics, 0.90)),
  quantile_99(metrics -> AnalysisMetric.asQuantile(metrics, 0.99)),
  quantile_5(
      // Map<String, ColumnMetric> -> Double
      metrics -> AnalysisMetric.asQuantile(metrics, 0.05)),
  quantile_95(metrics -> AnalysisMetric.asQuantile(metrics, 0.95)),

  // derived classification model metrics
  classification_recall(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getRecall();
      }),
  classification_fpr(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getFpr();
      }),
  classification_precision(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getPrecision();
      }),
  classification_accuracy(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getAccuracy();
      }),
  classification_f1(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getF1();
      }),
  classification_auroc(
      metrics -> {
        val cm =
            (ClassificationMetrics)
                Optional.ofNullable(metrics.get("classification"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (cm == null) return null;
        val row = cm.toMetricValues();
        return row.getMacroAuc();
      }),

  // derived regression model metrics
  regression_mse(
      metrics -> {
        val rm =
            (RegressionMetrics)
                Optional.ofNullable(metrics.get("regression"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        return rm == null ? null : rm.mse();
      }),
  regression_mae(
      metrics -> {
        val rm =
            (RegressionMetrics)
                Optional.ofNullable(metrics.get("regression"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        return rm == null ? null : rm.mae();
      }),
  regression_rmse(
      metrics -> {
        val rm =
            (RegressionMetrics)
                Optional.ofNullable(metrics.get("regression"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        return rm == null ? null : rm.rmse();
      }),
  prediction_count(
      metrics -> {
        Long count = null;

        val rm =
            (RegressionMetrics)
                Optional.ofNullable(metrics.get("regression"))
                    .map(ColumnMetric::getObjects)
                    .orElse(null);
        if (rm != null) {
          count = rm.getCount();
        }

        if (count == null) {
          val cm =
              (ClassificationMetrics)
                  Optional.ofNullable(metrics.get("classification"))
                      .map(ColumnMetric::getObjects)
                      .orElse(null);
          if (cm != null) {
            val confusion = cm.getConfusionMatrix();
            long total = 0;
            for (int i = 0; i < confusion.length; i++) {
              for (int j = 0; j < confusion[i].length; j++) {
                total += confusion[i][j];
              }
            }
            count = total;
          }
        }

        return isNull(count) ? null : (double) count;
      }),
  unknown(
      metrics ->
          Optional.ofNullable(metrics.get("types/object"))
              .map(m -> (double) m.getLongs())
              .orElse(null));

  private final Function<Map<String, ColumnMetric>, Double> extractors;

  AnalysisMetric(Function<Map<String, ColumnMetric>, Double> extractor) {
    this.extractors = extractor;
  }

  public Double apply(Map<String, ColumnMetric> m) {
    if (m == null) {
      return null;
    }
    return extractors.apply(m);
  }

  // Allow really simple aliases, for now.
  // Just replace '.' with '_' in the name...
  // This will catch names like "classification.f1" and "regression.rmse"
  // We can add more specific aliases if necessary.
  public static AnalysisMetric fromName(String name) {
    return valueOf(name.toLowerCase().replace('.', '_'));
  }

  // Map<String, ColumnMetric> -> Double

  public static Double asQuantile(Map<String, ColumnMetric> metrics, double fraction) {
    final double[] fractions = new double[] {fraction};

    val sketch = KllPostAgg.getSketch(metrics);
    if (sketch == null || sketch.isEmpty()) {
      return null;
    }
    val quantiles = sketch.getQuantiles(fractions);
    return Double.valueOf(quantiles[0]);
  }
}
