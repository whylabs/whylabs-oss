export const analyzerTypeFields: { [index: string]: string[] } = {
  column_list: ['columnList_added', 'columnList_removed'],
  comparison: ['comparison_expected', 'comparison_observed'],
  diff: [
    'diff_metricValue',
    'diff_threshold',
    'diff_mode',
    // following are only available for new results
    'threshold_calculatedLower',
    'threshold_calculatedUpper',
    'threshold_metricValue',
  ],
  drift: ['drift_metricValue', /* 'drift_minBatchSize', */ 'drift_threshold'],
  frequent_string_comparison: ['frequentStringComparison_sample'],
  list_comparison: ['comparison_observed'],
  stddev: [
    // 'threshold_baselineMetricValue',
    'threshold_factor',
    'threshold_calculatedLower',
    'threshold_calculatedUpper',
    'threshold_minBatchSize',
    'threshold_metricValue',
  ],
  seasonal: [
    // 'threshold_baselineMetricValue',
    'threshold_calculatedLower',
    'threshold_calculatedUpper',
    // 'threshold_minBatchSize',
    'threshold_metricValue',
  ],
  fixed: [
    // 'threshold_baselineMetricValue',
    'threshold_absoluteLower',
    'threshold_absoluteUpper',
    'threshold_metricValue',
  ],
  // these are in the API but dont get set
  unimplemented: ['threshold_baselineMetricValue', 'drift_minBatchSize', 'threshold_minBatchSize'],
};

export const allAnalyzerTypeFields: string[] = Object.values(analyzerTypeFields).flat();
