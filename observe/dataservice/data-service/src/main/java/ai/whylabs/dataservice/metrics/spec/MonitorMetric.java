package ai.whylabs.dataservice.metrics.spec;

import lombok.Getter;

public enum MonitorMetric {
  alert_count("alert_count"),
  threshold_upper("threshold_calculated_upper"),
  threshold_lower("threshold_calculated_lower"),
  runtime_nanos("runtime_nanos"),
  drift_value("drift_metric_value"),
  ;

  @Getter private final String sqlColumnName;

  MonitorMetric(String sqlColumnName) {
    this.sqlColumnName = sqlColumnName;
  }
}
