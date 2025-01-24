package ai.whylabs.dataservice.metrics.agg;

import java.util.Optional;
import lombok.Getter;

@Getter
public enum BuiltInProfileAgg implements Agg {
  kll_merge(MetricPath.kll, "kll_double_sketch_merge", "kll, 4096"),
  hll_union(MetricPath.hll, "hll_sketch_union", "hll"),
  sum_count(MetricPath.count, "sum", "n_sum"),
  variance_merge(MetricPath.variance, "whylabs.variance_tracker", "variance"),

  // below aggregators use Agg.BytesRow to extract complete sketch from postgres.
  classification_merge(
      MetricPath.classification,
      "classification_merge",
      "classification_profile",
      Agg.BytesRow.class),
  regression_merge(
      MetricPath.regression, "regression_merge", "regression_profile", Agg.BytesRow.class),
  kll_raw_merge(MetricPath.kll, "kll_double_sketch_merge", "kll, 4096", Agg.BytesRow.class),
  hll_raw_union(MetricPath.hll, "hll_sketch_union", "hll", Agg.BytesRow.class),

  // merging frequent string is more complicated because the datasketches
  // frequent_strings_sketch_merge crashes
  // on empty sketches.  Use a case statement to avoid that.
  frequent_strings_merge(
      MetricPath.frequent_strings,
      "frequent_strings_sketch_merge",
      "7, case\n"
          + "                                                                    when length(CAST(frequent_items as bytea)) > 8\n"
          + "                                                                        then frequent_items\n"
          + "                                   end",
      Agg.BytesRow.class),
  variance_raw_merge(
      MetricPath.variance, "whylabs.variance_tracker", "variance", Agg.VarianceRow.class),
  missing_datapoint_merge(null, "first", "dataset_timestamp"),
  last_upload_ts_merge(null, "max", "dataset_timestamp");

  private final String operation;

  private final MetricPath knownMetricPath;

  private final String column;

  private Class<? extends Agg.Row> resultsRow = Agg.NumericRow.class;

  BuiltInProfileAgg(MetricPath knownMetricPath, String operation, String column) {
    this.knownMetricPath = knownMetricPath;
    this.operation = operation;
    this.column = column;
  }

  BuiltInProfileAgg(
      MetricPath knownMetricPath,
      String operation,
      String column,
      Class<? extends Agg.Row> pgResults) {
    this.knownMetricPath = knownMetricPath;
    this.operation = operation;
    this.column = column;
    this.resultsRow = pgResults;
  }

  @Override
  public String getMetricPath() {
    return Optional.ofNullable(knownMetricPath).map(MetricPath::getPath).orElse(null);
  }
}
