package ai.whylabs.core.configV3.structure.enums;

import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchOperations;
import ai.whylabs.druid.whylogs.variance.VarianceOperations;
import com.shaded.whylabs.org.apache.datasketches.SketchesArgumentException;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public enum AnalysisMetric {
  median(metrics -> AnalysisMetric.asQuantile(metrics, 0.50)),
  count(
      // returns a double to make life easier for our calculations.
      result -> {
        val l = result.getLeft().getTotalCount();
        if (l != null) {
          return l.doubleValue();
        }
        return null;
      }),
  mean(
      result -> {
        val data = result.getLeft().getVarianceTracker();
        if (data != null && data.length != 0) {
          val v = VarianceOperations.deserializeFromByteArray(data);
          return v.getMean();
        }
        return null;
      }),
  stddev(
      result -> {
        val data = result.getLeft().getVarianceTracker();
        if (data != null && data.length != 0) {
          final VarianceTracker v = VarianceOperations.deserializeFromByteArray(data);
          return v.stddev();
        }
        return null;
      }),
  max(
      result -> {
        val data = result.getLeft().getHistogram();
        if (data != null && data.length != 0) {
          val sketch = KllDoublesSketchOperations.deserializeFromByteArray(data);
          return sketch.getMaxValue();
        }
        return null;
      }),
  min(
      result -> {
        val data = result.getLeft().getHistogram();
        if (data != null && data.length != 0) {
          val sketch = KllDoublesSketchOperations.deserializeFromByteArray(data);
          return sketch.getMinValue();
        }
        return null;
      }),
  // Validation: below not avail with arima
  histogram(
      result -> {
        val data = result.getLeft().getHistogram();
        if (data != null && data.length != 0) {
          return KllDoublesSketchOperations.deserializeFromByteArray(data);
        }
        return null;
      }),
  frequent_items(
      result -> {
        val data = result.getLeft().getFrequentItems();
        if (data != null && data.length != 0) {
          try {
            return FrequencyOperations.deserializeFromByteArray(data).get();
          } catch (SketchesArgumentException e) {
            log.warn("Failed to deserialize sketch", e);
            return null;
          }
        }
        return null;
      }),

  count_bool(
      result -> {
        val l = result.getLeft().getSchemaCountBoolean();
        return (l != null) ? l.doubleValue() : null;
      }),
  count_bool_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return ((double) result.getLeft().getSchemaCountBoolean()
            / (double) result.getLeft().getTotalCount());
      }),
  count_integral(
      result -> {
        val l = result.getLeft().getSchemaCountIntegral();
        return (l != null) ? l.doubleValue() : null;
      }),
  count_integral_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return ((double) result.getLeft().getSchemaCountIntegral()
            / (double) result.getLeft().getTotalCount());
      }),
  count_fractional(
      result -> {
        val l = result.getLeft().getSchemaCountFractional();
        return (l != null) ? l.doubleValue() : null;
      }),
  count_fractional_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return ((double) result.getLeft().getSchemaCountFractional()
            / (double) result.getLeft().getTotalCount());
      }),
  count_string(
      result -> {
        val l = result.getLeft().getSchemaCountString();
        return (l != null) ? l.doubleValue() : null;
      }),
  count_string_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return ((double) result.getLeft().getSchemaCountString()
            / (double) result.getLeft().getTotalCount());
      }),
  count_null(
      result -> {
        val l = result.getLeft().getNullCount();
        return (l != null) ? l.doubleValue() : null;
      }),
  count_null_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return ((double) result.getLeft().getNullCount()
            / (double) result.getLeft().getTotalCount());
      }),
  inferred_data_type(
      result -> {
        if (result.getLeft().getInferredType() != null
            && result.getLeft().getInferredType().getType() != null) {
          return result.getLeft().getInferredType().getType().toString();
        } else {
          return null;
        }
      }),
  continuous(
      result -> {
        // TODO:
        return null;
      }),
  discrete(
      result -> {
        return result.getLeft().getDiscrete();
      }),
  // Metrics that are applicable at the dataset level.
  field_list(
      result -> {
        return result.getLeft().getDatasetFields();
      }),
  input_count(
      result -> {
        // TODO:
        // Maximum number of values logged across all "input" features.
        return null;
      }),
  output_count(
      result -> {
        // TODO:
        // Maximum number of values logged across all "output" features.
        // a feature is "output" if it is listed in the model metrics as an output feature.

        return null;
      }),
  unique_lower(
      result -> {
        // TODO:
        return null;
      }),
  unique_lower_ratio(
      result -> {
        // TODO:
        return null;
      }),
  unique_upper(
      result -> {
        // TODO:
        return null;
      }),
  unique_upper_ratio(
      result -> {
        // TODO:
        return null;
      }),

  quantile_5(metrics -> AnalysisMetric.asQuantile(metrics, 0.05)),
  quantile_25(metrics -> AnalysisMetric.asQuantile(metrics, 0.25)),
  quantile_75(metrics -> AnalysisMetric.asQuantile(metrics, 0.75)),
  quantile_90(metrics -> AnalysisMetric.asQuantile(metrics, 0.90)),
  quantile_95(metrics -> AnalysisMetric.asQuantile(metrics, 0.95)),
  quantile_99(metrics -> AnalysisMetric.asQuantile(metrics, 0.99)),

  unique_est(
      result -> {
        return result.getLeft().getUnique();
      }),
  unique_est_ratio(
      result -> {
        if (result.getLeft().getTotalCount() == null || result.getLeft().getTotalCount() <= 0) {
          return null;
        }
        return (result.getLeft().getUnique() / (double) result.getLeft().getTotalCount());
      }),
  // derived classification model metrics
  classification_recall(
      result -> {
        return result.getLeft().getClassification_recall();
      }),
  classification_fpr(
      result -> {
        return result.getLeft().getClassification_fpr();
      }),
  classification_precision(
      result -> {
        return result.getLeft().getClassification_precision();
      }),
  classification_accuracy(
      result -> {
        return result.getLeft().getClassification_accuracy();
      }),
  classification_f1(
      result -> {
        return result.getLeft().getClassification_f1();
      }),
  classification_auroc(
      result -> {
        return result.getLeft().getClassification_auroc();
      }),

  // derived regression model metrics
  regression_mse(
      result -> {
        return result.getLeft().getRegression_mse();
      }), // mean squared error
  regression_mae(
      result -> {
        return result.getLeft().getRegression_mae();
      }), // mean absolute error
  regression_rmse(
      result -> {
        return result.getLeft().getRegression_rmse();
      }), // root mean squared error
  secondsSinceLastUpload(
      result -> {
        if (result.getLeft().getLastUploadTs() == null) {
          return null;
        }

        return (result.getRight().toInstant().toEpochMilli() - result.getLeft().getLastUploadTs())
            / 1000;
      }),
  missingDatapoint(
      result -> {
        if (result.getLeft().getMissing()) {
          return 1L;
        } else {
          return 0L;
        }
      }),

  // missing dataset metrics
  mostRecentDatasetTs(
      result -> {
        // TODO:
        return null;
      }),
  mostRecentDatasetDatalakeWriteTs(
      result -> {
        // TODO:
        return null;
      }),
  errorMetric( // throws error for testing
      result -> {
        throw new RuntimeException("errorMetric");
      });

  /**
   * Not everything can be backfilled. Operation metrics around ingestion are generated at job run
   * time for the latest datapoint only
   */
  public static boolean isBackfillable(AnalysisMetric m) {
    switch (m) {
      case secondsSinceLastUpload:
        return false;
      default:
        return true;
    }
  }

  public static boolean requireTargetPopulated(AnalysisMetric m) {
    switch (m) {
      case missingDatapoint:
        return false;
      default:
        return true;
    }
  }

  public static Class getExtractorOutputType(AnalysisMetric m) {
    switch (m) {
      case classification_accuracy:
      case classification_auroc:
      case classification_f1:
      case classification_fpr:
      case classification_precision:
      case classification_recall:
      case unique_est_ratio:
      case median:
      case count:
      case count_null:
      case count_bool:
      case count_integral:
      case count_fractional:
      case count_string:
      case mean:
      case stddev:
      case max:
      case min:
      case regression_mae:
      case regression_mse:
      case regression_rmse:
      case count_bool_ratio:
      case count_integral_ratio:
      case count_fractional_ratio:
      case count_string_ratio:
      case count_null_ratio:
      case unique_lower_ratio:
      case unique_upper_ratio:
      case quantile_5:
      case quantile_75:
      case quantile_25:
      case quantile_90:
      case quantile_95:
      case quantile_99:
      case unique_est:
        return Double.class;
      case secondsSinceLastUpload:
      case missingDatapoint:
      case unique_lower:
      case unique_upper:
        return Long.class;
      case inferred_data_type:
        return String.class;
      case discrete:
        return Boolean.class;
      case histogram:
        return KllDoublesSketch.class;
      case frequent_items:
        return ItemsSketch.class;
    }

    return null;
  }

  private final Function<Pair<QueryResultStructure, ZonedDateTime>, Object> extractors;

  AnalysisMetric(Function<Pair<QueryResultStructure, ZonedDateTime>, Object> extractor) {
    this.extractors = extractor;
  }

  public <T> T apply(QueryResultStructure struct, ZonedDateTime currentTime) {
    if (struct == null) {
      return null;
    }
    return (T) extractors.apply(Pair.of(struct, currentTime));
  }

  // Allow really simple aliases, for now.
  // Just replace '.' with '_' in the name...
  // This will catch names like "classification.f1" and "regression.rmse"
  // We can add more specific aliases if necessary.
  public static AnalysisMetric fromName(String name) {
    val underscored = name.replace('.', '_');
    try {
      return valueOf(underscored);
    } catch (IllegalArgumentException ex) {
      // Do a slightly more expensive case insensitive check just incase
      AnalysisMetric m =
          Arrays.stream(AnalysisMetric.values())
              .filter(e -> e.name().equalsIgnoreCase(underscored))
              .findAny()
              .orElse(null);
      if (m == null) {
        throw ex;
      }
      return m;
    }
  }

  public static Double asQuantile(Pair<QueryResultStructure, ZonedDateTime> row, double fraction) {
    final double[] fractions = new double[] {fraction};

    val data = row.getLeft().getHistogram();
    if (data != null && data.length != 0) {
      val sketch = KllDoublesSketchOperations.deserializeFromByteArray(data);
      if (sketch != null && !sketch.isEmpty()) {
        val quantiles = sketch.getQuantiles(fractions);
        return Double.valueOf(quantiles[0]);
      }
    }
    return null;
  }
}
