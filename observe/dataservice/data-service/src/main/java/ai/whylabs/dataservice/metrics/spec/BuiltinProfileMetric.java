package ai.whylabs.dataservice.metrics.spec;

import static ai.whylabs.dataservice.metrics.spec.Constants.BUILT_IN_METRIC_PATTERN;

import ai.whylabs.dataservice.metrics.agg.BuiltinSpec;
import ai.whylabs.dataservice.metrics.agg.Spec;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.google.common.collect.ImmutableList;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

@Getter
public enum BuiltinProfileMetric implements BuiltinMetric {
  min(BuiltinSpec.min),
  median(BuiltinSpec.median),
  max(BuiltinSpec.max),
  quantile_5(BuiltinSpec.quantile_5),
  quantile_25(BuiltinSpec.quantile_25),
  quantile_75(BuiltinSpec.quantile_75),
  quantile_90(BuiltinSpec.quantile_90),
  quantile_95(BuiltinSpec.quantile_95),
  quantile_99(BuiltinSpec.quantile_99),
  unique_est(BuiltinSpec.unique_est),
  unique_upper(BuiltinSpec.unique_upper),
  unique_lower(BuiltinSpec.unique_lower),
  unique_upper_ratio(
      MessageFormat.format("{0} / {1}", BuiltinSpec.unique_upper, BuiltinSpec.count)),
  unique_lower_ratio(
      MessageFormat.format("{0} / {1}", BuiltinSpec.unique_lower, BuiltinSpec.count)),
  count(BuiltinSpec.count),
  count_bool(BuiltinSpec.count_bool),
  count_integral(BuiltinSpec.count_integral),
  count_string(BuiltinSpec.count_string),
  count_fractional(BuiltinSpec.count_fractional),
  count_null(BuiltinSpec.count_null),
  variance(BuiltinSpec.variance),
  mean(BuiltinSpec.mean),
  @JsonAlias({"stddev"})
  std_dev(BuiltinSpec.std_dev),
  count_null_ratio(MessageFormat.format("{0} / {1}", BuiltinSpec.count_null, BuiltinSpec.count)),
  unique_est_ratio(MessageFormat.format("{0} / {1}", BuiltinSpec.unique_est, BuiltinSpec.count)),
  count_bool_ratio(MessageFormat.format("{0} / {1}", BuiltinSpec.count_bool, BuiltinSpec.count)),
  count_integral_ratio(
      MessageFormat.format("{0} / {1}", BuiltinSpec.count_integral, BuiltinSpec.count)),
  count_fractional_ratio(
      MessageFormat.format("{0} / {1}", BuiltinSpec.count_fractional, BuiltinSpec.count)),
  count_string_ratio(
      MessageFormat.format("{0} / {1}", BuiltinSpec.count_string, BuiltinSpec.count)),
  @JsonAlias({"classification.accuracy"})
  classification_accuracy(BuiltinSpec.classification_accuracy),
  @JsonAlias({"classification.recall"})
  classification_recall(BuiltinSpec.classification_recall),
  @JsonAlias({"classification.fpr"})
  classification_fpr(BuiltinSpec.classification_fpr),
  @JsonAlias({"classification.precision"})
  classification_precision(BuiltinSpec.classification_precision),
  @JsonAlias({"classification.f1"})
  classification_f1(BuiltinSpec.classification_f1),
  @JsonAlias({"classification.auc", "classification.auroc", "classification_auroc"})
  classification_auc(BuiltinSpec.classification_auc),
  @JsonAlias({"regression.mse"})
  regression_mse(BuiltinSpec.regression_mse),
  @JsonAlias({"regression.mae"})
  regression_mae(BuiltinSpec.regression_mae),
  @JsonAlias({"regression.rmse"})
  regression_rmse(BuiltinSpec.regression_rmse),
  @JsonAlias({"prediction.count"})
  prediction_count(
      MessageFormat.format(
          "Max({0}, {1})", BuiltinSpec.classification_count, BuiltinSpec.regression_count)),
  ;

  private final List<NumericMetric> metrics;
  private final String formula;

  BuiltinProfileMetric(Spec spec) {
    this.metrics = ImmutableList.of(NumericMetric.builder().spec(spec).build());
    this.formula = null;
  }

  BuiltinProfileMetric(String formula) {
    val matcher = BUILT_IN_METRIC_PATTERN.matcher(formula);
    val metricsBuilder = ImmutableList.<NumericMetric>builder();
    while (matcher.find()) {
      String group = matcher.group();
      try {
        val spec = BuiltinSpec.valueOf(group);
        metricsBuilder.add(NumericMetric.builder().hidden(true).spec(spec).build());
      } catch (IllegalArgumentException e) {
        // skip if not a BuiltinSpec
      }
    }
    this.metrics = metricsBuilder.build();
    this.formula = formula;
  }

  /** static map of aliases created through @JsonAlias. */
  private static final Map<String, BuiltinProfileMetric> aliasMap =
      new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

  /** build a map of aliases created through @JsonAlias. */
  static {
    for (BuiltinProfileMetric myEnum : values()) {
      JsonAlias aliasAnnotation = myEnum.getAnnotation(JsonAlias.class);
      if (aliasAnnotation != null) {
        for (String alias : aliasAnnotation.value()) {
          aliasMap.put(alias, myEnum);
        }
      }
    }
  }

  /** helper for assembling static list of aliases */
  private JsonAlias getAnnotation(Class<JsonAlias> annotationClass) {
    try {
      return this.getClass().getField(this.name()).getAnnotation(annotationClass);
    } catch (NoSuchFieldException e) {
      return null;
    }
  }

  /** custom deserialization to catch invalid metric names, and provide a useful error message. */
  @JsonCreator
  public static BuiltinProfileMetric forValue(String value) {
    // check for aliases first.
    BuiltinProfileMetric metric = aliasMap.get(value);
    if (metric != null) {
      return metric;
    }

    // try to convert to enum, list all valid values in failure message.
    try {
      metric = BuiltinProfileMetric.valueOf(StringUtils.lowerCase(value));
    } catch (IllegalArgumentException e) {
      String msg = String.format("Unrecognized builtin profile metric \"%s\".\n", value);
      msg += "Valid metric names are: ";
      msg +=
          Arrays.stream(BuiltinProfileMetric.values())
              .map(BuiltinProfileMetric::name)
              .collect(Collectors.joining(", "));
      // implementation note: micronaut converts RuntimeException to ConversionErrorException before
      // surfacing.
      throw new RuntimeException(msg);
    }
    return metric;
  }
}
