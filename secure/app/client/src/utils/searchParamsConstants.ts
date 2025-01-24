export const DATE_START_QUERY_NAME = 'startDate';
export const DATE_END_QUERY_NAME = 'endDate';
export const PRESET_RANGE_QUERY_NAME = 'presetRange';
export const GLOBAL_DATE_PICKER_PARAMS = [DATE_START_QUERY_NAME, DATE_END_QUERY_NAME, PRESET_RANGE_QUERY_NAME] as const;

export const LIMIT_QUERY_NAME = 'limit';
export const OFFSET_QUERY_NAME = 'offset';
export const PAGING_TAGS = [LIMIT_QUERY_NAME, OFFSET_QUERY_NAME] as const;

export const IS_EMBEDDED_QUERY_NAME = 'embedded';

export const SORT_BY_QUERY_NAME = 'sortBy';
export const SORT_DIRECTION_QUERY_NAME = 'sortDirection';

export const SELECTED_RESOURCE_QUERY_NAME = 'resource';
export const SELECTED_COLUMN_QUERY_NAME = 'column';
export const SELECTED_METRIC_QUERY_NAME = 'metric';
export const SELECTED_SEGMENT_QUERY_NAME = 'segment';
export const SELECTED_CONSTRAINT_QUERY_NAME = 'constraint';
export const THRESHOLD_QUERY_NAME = 'threshold';
export const SEARCH_TEXT_QUERY_NAME = 'search';

// used for insights
export const SELECTED_BATCH_QUERY_NAME = 'selectedBatch';
export const SELECTED_REFERENCE_PROFILE_QUERY_NAME = 'selectedReferenceProfile';

// General
export const BACK_TO_QUERY_NAME = 'backTo';
export const SELECTED_QUERY_NAME = 'selected';
export const SELECTED_TAB_NAME = 'tab';
export const CURRENT_FILTER = 'filter';

// Llm Secure
export const POLICY_OPENED_CARD = 'policyCard';
export const FILTERED_TRACES = 'filterTraceId';
export const SELECTED_ALL_TRACES = 'selectedAllTraces';

export const COMPONENTS_STATE_KEYS = [
  SELECTED_RESOURCE_QUERY_NAME,
  SELECTED_COLUMN_QUERY_NAME,
  SELECTED_METRIC_QUERY_NAME,
  SELECTED_CONSTRAINT_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
  SELECTED_BATCH_QUERY_NAME,
  SELECTED_REFERENCE_PROFILE_QUERY_NAME,
  SELECTED_QUERY_NAME,
  SELECTED_TAB_NAME,
  POLICY_OPENED_CARD,
  FILTERED_TRACES,
  SELECTED_ALL_TRACES,
] as const;

// used for comparison date ranges
export const TEMP_START_DATE_RANGE = 'tempStart';
export const TEMP_END_DATE_RANGE = 'tempEnd';
export const TEMP_RANGE_PRESET = 'tempPreset';
export const SUPER_PICKER_TEMP_PARAMS = [TEMP_START_DATE_RANGE, TEMP_END_DATE_RANGE, TEMP_RANGE_PRESET] as const;

// Segment Analysis a.k.a. Performance Tracing
export const ACTIVE_COMPARISON = 'comparison';
export const METRICS_PRESET = 'metricsPreset';
export const PRIMARY_METRIC = 'primaryMetric';
export const SECONDARY_METRIC = 'secondaryMetric';
const SEGMENT_ANALYSIS_KEYS = [METRICS_PRESET, PRIMARY_METRIC, SECONDARY_METRIC, ACTIVE_COMPARISON] as const;

// filters
export const FILTER_KEYS = [SEARCH_TEXT_QUERY_NAME, CURRENT_FILTER] as const;

// used to define removable or sticky url params in WhyLabsNavigation
export const STICKY_PARAMS = [
  IS_EMBEDDED_QUERY_NAME,
  BACK_TO_QUERY_NAME,
  SELECTED_SEGMENT_QUERY_NAME,
  ...GLOBAL_DATE_PICKER_PARAMS,
] as const;

export const TEMP_PARAMS = [
  ...COMPONENTS_STATE_KEYS,
  ...PAGING_TAGS,
  ...FILTER_KEYS,
  ...SUPER_PICKER_TEMP_PARAMS,
  ...SEGMENT_ANALYSIS_KEYS,
] as const;
