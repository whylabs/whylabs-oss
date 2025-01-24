package ai.whylabs.dataservice.metrics.agg;

/**
 * WHat level of aggregation does a metric support? For example, if we are looking at count per
 * column, users are expected to pass in the column name as part of the query.
 */
public enum MetricAggregationLevel {
  COLUMN,
  RESOURCE,
  ORGANIZATION,
}
