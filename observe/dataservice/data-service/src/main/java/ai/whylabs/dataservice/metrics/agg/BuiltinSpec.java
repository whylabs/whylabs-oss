package ai.whylabs.dataservice.metrics.agg;

import static ai.whylabs.dataservice.metrics.agg.BuiltInProfileAgg.*;
import static ai.whylabs.dataservice.metrics.agg.MonitorAgg.*;
import static java.util.Objects.isNull;

import ai.whylabs.dataservice.metrics.postagg.*;
import com.google.common.collect.ImmutableList;
import java.util.List;
import java.util.Optional;
import lombok.Getter;

@Getter
public enum BuiltinSpec implements Spec {
  // profiles specs
  min(kll_merge, new QuantilePostAgg(0.0)),
  median(kll_merge, new QuantilePostAgg(0.5)),
  max(kll_merge, new QuantilePostAgg(1.0)),
  quantile_5(kll_merge, new QuantilePostAgg(0.05)),
  quantile_25(kll_merge, new QuantilePostAgg(0.25)),
  quantile_75(kll_merge, new QuantilePostAgg(0.75)),
  quantile_90(kll_merge, new QuantilePostAgg(0.90)),
  quantile_95(kll_merge, new QuantilePostAgg(0.95)),
  quantile_99(kll_merge, new QuantilePostAgg(0.99)),
  unique_est(hll_union, new UniqueEstPostAgg(1, 1)),
  unique_upper(hll_union, new UniqueEstPostAgg(1, 2)),
  unique_lower(hll_union, new UniqueEstPostAgg(1, 3)),
  variance(BuiltInProfileAgg.variance_merge, ZeroArgsPostAgg.of("whylabs.variance(agg_data)")),
  mean(BuiltInProfileAgg.variance_merge, ZeroArgsPostAgg.of("agg_data[3]")),
  std_dev(BuiltInProfileAgg.variance_merge, ZeroArgsPostAgg.of("SQRT(whylabs.variance(agg_data))")),
  count(sum_count),
  count_null(MetricPath.count_null, sum_count),
  count_string(MetricPath.types_string, sum_count),
  count_bool(MetricPath.types_boolean, sum_count),
  count_fractional(MetricPath.types_fractional, sum_count),
  count_object(MetricPath.types_object, sum_count),
  count_integral(MetricPath.types_integral, sum_count),
  classification_accuracy(
      classification_merge,
      new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.accuracy)),
  classification_recall(
      classification_merge, new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.recall)),
  classification_fpr(
      classification_merge, new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.fpr)),
  classification_precision(
      classification_merge,
      new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.precision)),
  classification_f1(
      classification_merge, new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.f1)),
  classification_auc(
      classification_merge, new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.auc)),
  regression_mse(regression_merge, new RegressionPostAgg(RegressionPostAgg.NumericMetric.mse)),
  regression_mae(regression_merge, new RegressionPostAgg(RegressionPostAgg.NumericMetric.mae)),
  regression_rmse(regression_merge, new RegressionPostAgg(RegressionPostAgg.NumericMetric.rmse)),
  classification_count(
      classification_merge, new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.count)),
  regression_count(regression_merge, new RegressionPostAgg(RegressionPostAgg.NumericMetric.count)),

  // monitor specs
  monitor_max_threshold(max_threshold),
  monitor_min_threshold(min_threshold),
  monitor_max_drift(min_drift),
  monitor_min_drift(max_drift),
  monitor_avg_drift(avg_drift),
  monitor_max_diff(min_diff),
  monitor_min_diff(max_diff),
  monitor_anomaly_count(anomaly_count),

  // traces specs
  traces_count(BuiltInTraceAgg.traceid, new KustoSumPostAgg()),
  tags_count(BuiltInTraceAgg.tags, new KustoNonEmptyArrayPostAgg()),
  actions_count(BuiltInTraceAgg.actions, new KustoNonEmptyArrayPostAgg()),
  tokens_count(BuiltInTraceAgg.tokens, new KustoSumPostAgg()),
  latency_millis(BuiltInTraceAgg.latency, new KustoSumPostAgg()),
  kll_raw(kll_raw_merge),
  hll_raw(hll_raw_union),
  variance_raw(variance_raw_merge),
  frequent_strings_raw(frequent_strings_merge),
  classification_raw(classification_merge),
  regression_raw(regression_merge),
  missing_datapoint(missing_datapoint_merge),
  last_upload_ts(last_upload_ts_merge);

  private final MetricPath knownMetricPath;
  private final PostAgg postAgg;
  private final Agg agg;

  BuiltinSpec(Agg merge) {
    this(merge, null);
  }

  BuiltinSpec(Agg merge, PostAgg postAgg) {
    this(null, merge, postAgg);
  }

  BuiltinSpec(MetricPath metricPath, Agg merge) {
    this(metricPath, merge, null);
  }

  BuiltinSpec(MetricPath metricPath, Agg agg, PostAgg postAgg) {
    this.knownMetricPath = metricPath;
    this.agg = agg;
    this.postAgg = isNull(postAgg) ? new NoopPostAgg() : postAgg;
  }

  @Override
  public String getMetricPath() {
    return Optional.ofNullable(knownMetricPath)
        .map(MetricPath::getPath)
        .orElseGet(() -> agg.getMetricPath());
  }

  @Override
  public List<MetricAggregationLevel> getSupportedLevels() {
    return ImmutableList.of(MetricAggregationLevel.COLUMN);
  }
}
