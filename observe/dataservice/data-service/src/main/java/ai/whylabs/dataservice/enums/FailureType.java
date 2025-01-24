package ai.whylabs.dataservice.enums;

public enum FailureType {
  data_unavailable,
  missing_entity_schema,
  query_planning_failure,
  unknown_metric,
  unbound_entity_schema,
  dataset_inactive,
  timed_out_planning
}
