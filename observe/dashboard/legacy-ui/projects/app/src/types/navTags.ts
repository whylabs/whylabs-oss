import { FilterKeys, FilterValues } from 'hooks/useFilterQueryString';

export const LIMIT_TAG = 'limit';
export const OFFSET_TAG = 'offset';
export const FEATURE_HIGHLIGHT_TAG = 'feature-highlight';
export const PROFILE_TAG = 'profile';
export const PROFILE_REPORT = 'profileReport';
export const LEGACY_DATE_RANGE_TAG = 'dateRange';
export const VIEW_TYPE = 'viewType';
export const SEGMENT_KEY_TAG = 'key';
export const SEGMENT_VALUE_TAG = 'value';
export const DATE_RANGE_SEPARATOR = '-to-';
export const INDIVIDUAL_SEPARATOR = '-individual-';
export const ACTION_STATE_TAG = 'userActionState';

/* ----- Tag Groups -----*/
// note: always create arrays [] as const, to avoid break union types to get intellisense
// if you are using enums use the same pattern as SORT_TAGS, typing the const to make intellisense works
export const PROFILE_KEYS = [PROFILE_TAG, FEATURE_HIGHLIGHT_TAG] as const;
export const PAGING_TAGS = [LIMIT_TAG, OFFSET_TAG] as const;
export const COMPARE_KEY = 'compare';
export const EDITING_KEY = 'edit';
export const MONITOR_KEY = 'monitor';
export const ANALYZER_FILTER = 'filterByAnalyzer';
export const SELECTED_TIMESTAMP = 'selectedTimestamp';
export const CURRENT_FILTER = 'filter';
export const FILTER_KEYS: readonly FilterValues[] = [...Object.values(FilterKeys)] as const;
export const VIEW_TYPE_KEYS = [VIEW_TYPE] as const;
export const SEGMENT_TYPE_KEYS = [SEGMENT_KEY_TAG, SEGMENT_VALUE_TAG] as const;
export const LLM_COMPARED_WITH = 'comparedWith';
export const LLM_PRIMARY_SEGMENT = 'primarySegment';
export const LLM_SECONDARY_SEGMENT = 'secondarySegment';

export const LLM_BATCH_PARAMS = [LLM_COMPARED_WITH, LLM_PRIMARY_SEGMENT, LLM_SECONDARY_SEGMENT] as const;

// new date picker
export const NEW_GLOBAL_START_RANGE = 'startDate';
export const NEW_GLOBAL_END_RANGE = 'endDate';
export const NEW_GLOBAL_RANGE_PRESET = 'presetRange';

export const NEW_GLOBAL_DATE_PICKER_PARAMS = [
  NEW_GLOBAL_START_RANGE,
  NEW_GLOBAL_END_RANGE,
  NEW_GLOBAL_RANGE_PRESET,
] as const;

export const TEMP_START_DATE_RANGE = 'tempStart';
export const TEMP_END_DATE_RANGE = 'tempEnd';
export const TEMP_RANGE_PRESET = 'tempPreset';
export const TEMP_COMPARED_START_DATE_RANGE = 'secondaryStart';
export const TEMP_COMPARED_END_DATE_RANGE = 'secondaryEnd';
export const TEMP_COMPARED_RANGE_PRESET = 'secondaryPreset';
export const SUPER_PICKER_TEMP_PARAMS = [
  TEMP_START_DATE_RANGE,
  TEMP_END_DATE_RANGE,
  TEMP_RANGE_PRESET,
  TEMP_COMPARED_START_DATE_RANGE,
  TEMP_COMPARED_END_DATE_RANGE,
  TEMP_COMPARED_RANGE_PRESET,
] as const;

// segment analysis controls -- while we need to use iframe
export const ACTIVE_COMPARISON = 'comparison';
export const METRICS_PRESET = 'metricsPreset';
export const PRIMARY_METRIC = 'primaryMetric';
export const SECONDARY_METRIC = 'secondaryMetric';
export const SELECTED_COLUMN_QUERY_NAME = 'column';
export const THRESHOLD_QUERY_NAME = 'threshold';
export const SEGMENT_ANALYSIS_KEYS = [
  METRICS_PRESET,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  ACTIVE_COMPARISON,
  SELECTED_COLUMN_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
] as const;

// new stack params
export const NEW_STACK_EMBEDDED_KEY = 'embedded';
export const NEW_STACK_CUSTOM_EMBEDDED_KEY = 'customEmbedded';
export const NEW_STACK_RESOURCE_KEY = 'resource';
export const NEW_STACK_SELECTED_BATCH_KEY = 'selectedBatch';
export const NEW_STACK_SORT_BY_KEY = 'sortBy';
export const NEW_STACK_SORT_DIRECTION_KEY = 'sortDirection';
export const NEW_STACK_METRIC_KEY = 'metric';
export const NEW_STACK_COLUMN_KEY = 'column';
export const NEW_STACK_BACK_TO_KEY = 'backTo';
export const NEW_STACK_SEGMENT = 'segment';

// correlated anomalies params
export const ACTIVE_CORRELATED_COLUMN = 'activeCorrelatedColumn';
export const ACTIVE_CORRELATED_TYPE = 'activeCorrelatedType';
export const CORRELATED_SECTION_TAGS = [ACTIVE_CORRELATED_COLUMN, ACTIVE_CORRELATED_TYPE] as const;

// insights page
export const INSIGHTS_SELECTED_PROFILE = 'insightSelectedProfile';
export const INSIGHTS_FILTER_BY_TAG = 'insightFilterBy';

// custom dashboards
export const USED_ON_KEY = 'usedOn';
