package ai.whylabs.dataservice.metrics.agg;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Getter;

/**
 * spotless:off
 * These are pre-constructed monitor aggregators.  Each includes the names of column in the PG analyzer results table,
 * and a SQL aggregation operator.
 *
 * When specifying a MonitorAgg in json, it may be specified as one of the pre-constructed enum values, or as a custom
 * object definition.
 * e.g.     "aggregation": "sum_threshold",
 * -or-     "aggregation": {"op":"sum", "column":"threshold_calculated_upper"},
 * spotless:on
 */
@Getter
@JsonDeserialize(using = MonitorAggDeserializer.class)
public enum MonitorAgg implements Agg {
  sum_threshold("sum", "threshold_metric_value"),
  max_threshold("max", "threshold_metric_value"),
  min_threshold("min", "threshold_metric_value"),
  max_drift("max", "drift_metric_value"),
  min_drift("min", "drift_metric_value"),
  avg_drift("avg", "drift_metric_value"),
  max_diff("max", "diff_metric_value"),
  min_diff("min", "diff_metric_value"),
  anomaly_count("sum", "anomaly_count"),
  ;

  private final String operation;

  private final String column;

  private Class<? extends Agg.Row> resultsRow = Agg.NumericRow.class;

  MonitorAgg(String operation, String column) {
    this.operation = operation;
    this.column = column;
  }
}
