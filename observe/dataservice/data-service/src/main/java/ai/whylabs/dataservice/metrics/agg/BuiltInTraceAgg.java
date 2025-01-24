package ai.whylabs.dataservice.metrics.agg;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;

@Getter
public enum BuiltInTraceAgg implements Agg {
  traceid("count(%s)", "TraceId"),
  tags("make_set(TraceAttributes['%s'])", "langkit.insights.tags"),
  actions("make_set(TraceAttributes['%s'])", "langkit.action.type"),
  tokens("array_sum(make_list(TraceAttributes['%s']))", "llm.usage.total_tokens"),
  latency(
      "array_sum(make_list_if(datetime_diff('millisecond', EndTime, StartTime), isempty(ParentId)))"),
  ;

  private final String operation;

  private final String column;

  private Class<? extends Row> resultsRow = NumericRow.class;

  BuiltInTraceAgg(String operation, String column) {
    this.operation = operation;
    this.column = column;
  }

  BuiltInTraceAgg(String operation) {
    this.operation = operation;
    this.column = "";
  }

  BuiltInTraceAgg(
      MetricPath knownMetricPath,
      String operation,
      String column,
      Class<? extends Row> kustoResults) {
    this.operation = operation;
    this.column = column;
    this.resultsRow = kustoResults;
  }

  @Override
  public String getMetricPath() {
    return "";
  }

  @JsonIgnore
  // not sql, more properly data query language (dql), but using the available interface.
  public String getSql() {
    return String.format(operation, column);
  }
}
