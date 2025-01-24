export type Maybe<T> = T | null | undefined;
export type NumberNaNInf = number | 'NaN' | 'Infinity' | 'Inf'; // possible values for numeric columns

export type SourceAlgorithmType =
  | 'expected'
  | 'column_list'
  | 'comparison'
  | 'diff'
  | 'drift'
  | 'stddev'
  | 'seasonal'
  | 'fixed'
  | 'experimental';

export enum SourceFeatureType {
  Unknown = 'UNKNOWN',
  Null = 'NULL',
  Fractional = 'FRACTIONAL',
  Integral = 'INTEGRAL',
  Boolean = 'BOOLEAN',
  String = 'STRING',
}

export type DataServiceFeatureType = `${SourceFeatureType}`;

export interface DataServiceInferredType {
  ratio?: number;
  type?: DataServiceFeatureType;
}

export type DataServiceAnalysisMetric =
  // | 'profile.count'
  // | 'profile.last_ingestion_time'
  // | 'profile.first_ingestion_time'
  // | 'tbd'
  // | 'input.count'
  // | 'output.count'
  | 'classification.f1'
  | 'classification.fpr'
  | 'classification.precision'
  | 'classification.recall'
  | 'classification.accuracy'
  | 'classification.auroc'
  | 'classification.aupr'
  | 'regression.mse'
  | 'regression.mae'
  | 'regression.rmse'
  | 'count'
  | 'median'
  | 'min'
  | 'max'
  | 'mean'
  | 'stddev'
  | 'variance'
  | 'unique_upper'
  | 'unique_upper_ratio'
  | 'unique_est'
  | 'unique_est_ratio'
  | 'unique_lower'
  | 'unique_lower_ratio'
  | 'count_bool'
  | 'count_bool_ratio'
  | 'count_integral'
  | 'count_integral_ratio'
  | 'count_fractional'
  | 'count_fractional_ratio'
  | 'count_string'
  | 'count_string_ratio'
  | 'count_null'
  | 'count_null_ratio'
  | 'inferred_data_type'
  | 'quantile_75'
  | 'quantile_25'
  | 'quantile_5'
  | 'quantile_90'
  | 'quantile_99'
  | 'quantile_95'
  | 'histogram'
  | 'frequent_items'
  // | 'column_row_count_sum'
  // | 'shape_column_count'
  // | 'shape_row_count'
  | 'secondsSinceLastUpload'
  | 'missingDatapoint'
  | 'prediction_count'
  | string;

/**
 * Defines the type of the analyzer algorithm that produced the analysis result.
 * Declared in the monitor code:
 * https://gitlab.com/whylabs/core/whylabs-processing-core/-/tree/mainline/murmuration/src/main/java/ai/whylabs/core/calculationsV3/results
 */
export type DataServiceAnalysisResultType =
  | 'CalculationResult'
  | 'ConjunctionCalculationResult'
  | 'DisjunctionCalculationResult'
  | 'DiffCalculationResult'
  | 'DriftCalculationResult'
  | 'EqualityCalculationResult'
  | 'ListComparisonResult'
  | 'FixedCalculationResult'
  | 'SchemaChangeResult'
  | 'SeasonalResult'
  | 'StddevCalculationResult'
  | 'FrequentStringComparisonResult';

export interface MutableAnalysisResultSchema {
  __time: Maybe<NumberNaNInf>;
  algorithm: Maybe<string>;
  algorithmMode: Maybe<string>;
  analysisId: Maybe<string>;
  analyzerConfigVersion: Maybe<NumberNaNInf>;
  analyzerId: Maybe<string>;
  analyzerResultType: Maybe<DataServiceAnalysisResultType>;
  analyzerType: Maybe<SourceAlgorithmType>;
  anomalyCount: Maybe<NumberNaNInf>;
  baselineBatchesWithProfileCount: Maybe<NumberNaNInf>;
  baselineCount: Maybe<NumberNaNInf>;
  calculationRuntimeNano: Maybe<NumberNaNInf>;
  column: Maybe<string>;
  columnList_added: Maybe<NumberNaNInf>;
  columnList_removed: Maybe<NumberNaNInf>;
  comparison_expected: Maybe<string>;
  comparison_observed: Maybe<string>;
  creationTimestamp: Maybe<NumberNaNInf>;
  datasetId: Maybe<string>;
  datasetTimestamp: Maybe<NumberNaNInf>;
  diff_metricValue: Maybe<NumberNaNInf>;
  diff_mode: Maybe<string>;
  diff_threshold: Maybe<NumberNaNInf>;
  drift_metricValue: Maybe<NumberNaNInf>;
  drift_minBatchSize: Maybe<NumberNaNInf>;
  drift_threshold: Maybe<NumberNaNInf>;
  entitySchemaVersion: Maybe<NumberNaNInf>;
  expectedBaselineCount: Maybe<NumberNaNInf>;
  expectedBaselineSuppressionThreshold: Maybe<NumberNaNInf>;
  failureExplanation: Maybe<string>;
  failureType: Maybe<string>;
  frequentStringComparison_operator: Maybe<string>;
  frequentStringComparison_sample: Maybe<string>;
  granularity: Maybe<string>;
  id: Maybe<string>;
  isRollup: Maybe<NumberNaNInf>;
  metric: Maybe<DataServiceAnalysisMetric>;
  monitorConfigVersion: Maybe<NumberNaNInf>;
  monitorIds: Maybe<string[] | string>;
  mostRecentDatasetDatalakeWriteTs: Maybe<NumberNaNInf>;
  orgId: Maybe<string>;
  referenceProfileId: Maybe<string>;
  runId: Maybe<string>;
  segment: Maybe<string>;
  segmentWeight: Maybe<NumberNaNInf>;
  segmentWeightProvided: Maybe<NumberNaNInf>;
  targetBatchesWithProfileCount: Maybe<NumberNaNInf>;
  targetCount: Maybe<NumberNaNInf>;
  targetLevel: Maybe<string>;
  threshold_absoluteLower: Maybe<NumberNaNInf>;
  threshold_absoluteUpper: Maybe<NumberNaNInf>;
  threshold_baselineMetricValue: Maybe<NumberNaNInf>;
  threshold_calculatedLower: Maybe<NumberNaNInf>;
  threshold_calculatedUpper: Maybe<NumberNaNInf>;
  threshold_factor: Maybe<NumberNaNInf>;
  threshold_metricValue: Maybe<NumberNaNInf>;
  threshold_minBatchSize: Maybe<NumberNaNInf>;
  threshold_type: Maybe<string>;
  userInitiatedBackfill: Maybe<NumberNaNInf>;
  weight: Maybe<NumberNaNInf>;
  weightConfigVersion: Maybe<NumberNaNInf>;
}

export const defaultQuantileFractions = [0.0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1.0];

export const classificationMetrics = ['recall', 'fpr', 'precision', 'accuracy', 'f1', 'macroAuc'] as const;
export const regressionMetrics = ['mean_squared_error', 'mean_absolute_error', 'root_mean_squared_error'] as const;

const allAvailableMetrics = [...classificationMetrics, ...regressionMetrics] as const;
const allAvailableMetricsSet = new Set(allAvailableMetrics);
type DerivedPerfMetric = (typeof allAvailableMetrics)[number];
export type DerivedMetric = DerivedPerfMetric | 'count';

export const isDataServiceDerivedMetric = (metricName: string): metricName is DerivedMetric =>
  allAvailableMetricsSet.has(metricName as DerivedPerfMetric);
