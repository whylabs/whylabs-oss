import {
  AlgorithmType,
  Analyzer,
  ColumnListChangeConfig,
  ComparisonConfig,
  DatasetMetric,
  DiffConfig,
  DriftConfig,
  ExperimentalConfig,
  FixedThresholdsConfig,
  FrequentStringComparisonConfig,
  Granularity,
  ListComparisonConfig,
  Monitor,
  SeasonalConfig,
  SimpleColumnMetric,
  StddevConfig,
} from 'generated/monitor-schema';
import { AnalysisMetric } from 'generated/graphql';
import { Extends } from 'types/genericTypes';

// phase I - card I
export const useCaseOptions = [
  {
    value: 'Drift',
    disabled: false,
  },
  {
    value: 'Data quality',
    disabled: false,
  },
  {
    value: 'Model performance',
    disabled: false,
  },
] as const;
export type UseCaseOption = typeof useCaseOptions[number]['value'];

interface OptionsItem {
  value: MetricTypeInUse;
  label: string;
  tooltip?: string;
}

export const regressionMetrics: MetricTypeInUse[] = ['regression.mae', 'regression.mse', 'regression.rmse'];
export const classificationMetrics: MetricTypeInUse[] = [
  'classification.accuracy',
  'classification.fpr',
  'classification.auroc',
  'classification.f1',
  'classification.precision',
  'classification.recall',
];

export const supportedAnalyzerTypesUI: AlgorithmType[] = ['diff', 'drift', 'stddev', 'fixed', 'comparison'];

export const availableMetrics: MetricTypeInUse[] = [
  ...classificationMetrics,
  'frequent_items',
  'histogram',
  ...regressionMetrics,
  'unique_est',
  'unique_est_ratio',
  'count_null',
  'count_null_ratio',
  'inferred_data_type',
];

// phase I - card II
export type ModelClassificationValues = Extends<
  DatasetMetric,
  | 'classification.f1'
  | 'classification.precision'
  | 'classification.recall'
  | 'classification.accuracy'
  | 'classification.fpr'
  | 'classification.auroc'
>;

export const whylabsPerformanceMetricsMapper = new Map<AnalysisMetric, OptionsItem>([
  [AnalysisMetric.ClassificationAccuracy, { value: 'classification.accuracy', label: 'Accuracy' }],
  [AnalysisMetric.ClassificationF1, { value: 'classification.f1', label: 'F1 Score' }],
  [AnalysisMetric.ClassificationRecall, { value: 'classification.recall', label: 'Recall' }],
  [AnalysisMetric.ClassificationPrecision, { value: 'classification.precision', label: 'Precision' }],
  [AnalysisMetric.ClassificationFpr, { value: 'classification.fpr', label: 'False Positive Rate' }],
  [AnalysisMetric.ClassificationAuroc, { value: 'classification.auroc', label: 'Area Under ROC' }],
  [AnalysisMetric.RegressionMae, { value: 'regression.mae', label: 'Mean Absolute Error' }],
  [AnalysisMetric.RegressionMse, { value: 'regression.mse', label: 'Mean Squared Error' }],
  [AnalysisMetric.RegressionRmse, { value: 'regression.rmse', label: 'Root Mean Squared Error' }],
]);

export type ModelRegressionValues = Extends<DatasetMetric, 'regression.mse' | 'regression.mae' | 'regression.rmse'>;
export const dataDriftOptions = [
  { value: 'both', label: 'Both input and output columns' },
  { value: 'input', label: 'Input columns' },
  { value: 'output', label: 'Output columns' },
] as const;
export const dataQualityOptions = [
  { value: 'missing value changes', label: 'Missing value changes' },
  { value: 'unique value changes', label: 'Unique value changes' },
  { value: 'inferred data type changes', label: 'Inferred data type changes' },
] as const;
export const dataQualityTypeOfChange = [
  { value: 'ratio', label: 'As a ratio' },
  { value: 'estimated count', label: 'As an estimated count' },
] as const;
export type DataDriftOption = typeof dataDriftOptions[number]['value'];
export type DataQualityOption = typeof dataQualityOptions[number]['value'];
export type DataQualityTypeOfChange = typeof dataQualityTypeOfChange[number]['value'];
export const dataQualityMetrics = [
  'count_null_ratio',
  'count_null',
  'unique_est',
  'unique_est_ratio',
  'inferred_data_type',
] as const;
export type DataQualityMetrics = typeof dataQualityMetrics[number];

// phase II - card I
export const changeTypeOptions = [
  {
    label: 'percentage change',
  },
  {
    label: 'absolute value change',
  },
  {
    label: 'static threshold',
  },
  {
    label: 'standard deviation change',
  },
] as const;
export type ChangeTypeOption = typeof changeTypeOptions[number]['label'];
export const dataQualityAnalysisType = [
  {
    label: 'standard deviation change',
  },
  {
    label: 'static threshold',
  },
] as const;

interface DriftThreshold {
  tooltip: string;
  min: number;
  max?: number;
  defaultValue: number;
}

export const getAlgorithmByString = new Map<string, DriftConfig['algorithm']>([
  ['hellinger', 'hellinger'],
  ['jensenshannon', 'jensenshannon'],
  ['kl_divergence', 'kl_divergence'],
  ['psi', 'psi'],
]);

export const thresholdAlgorithmMap = new Map<DriftConfig['algorithm'], DriftThreshold>([
  ['hellinger', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.7 }],
  ['jensenshannon', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.1 }],
  ['kl_divergence', { tooltip: 'Positive number', min: 0, defaultValue: 0.1 }],
  ['psi', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.2 }],
]);

export const driftAlgorithmOptions = [
  {
    label: 'Hellinger distance (recommended)',
    value: 'hellinger',
  },
  {
    label: 'Jensen Shannon (JS)  divergence',
    value: 'jensenshannon',
  },
  {
    label: 'Kullback-Leiber (KL) divergence',
    value: 'kl_divergence',
  },
  {
    label: 'Population Stability Index (PSI)',
    value: 'psi',
  },
] as const;

export const discreteTypeOptions = [
  {
    value: 'both',
    label: 'Both discrete and non-discrete',
    correlatedMetric: 'inferred_data_type',
    tooltip: 'Both discrete and non-discrete',
  },
  {
    value: 'discrete',
    label: 'Discrete',
    // subset of DatasetMetric
    correlatedMetric: 'frequent_items',
    tooltip:
      'Columns that have been inferred as discrete, based on having a low number of unique values compared to the total number of values.',
  },
  {
    value: 'non-discrete',
    label: 'Non-discrete',
    // subset of DatasetMetric
    correlatedMetric: 'histogram',
    tooltip:
      'Columns that have been inferred as non-discrete, based on having a high number of unique values compared to the total number of values.',
  },
] as const;
export type DiscreteTypeOption = typeof discreteTypeOptions[number]['value'];
export type DriftMetricOption = typeof discreteTypeOptions[number]['correlatedMetric'];
// phase III - card II - A
export const monitorBaselineOptions = [
  { label: 'Trailing window', value: 'TrailingWindow' },
  { label: 'Reference profile', value: 'Reference' },
  { label: 'Reference date range', value: 'TimeRange' },
] as const;
export type MonitorBaselineOption = typeof monitorBaselineOptions[number]['value'];

// phase III - card II - Trailing window options
const trailingWindowOptionsHourly = [
  { label: '4 hours', value: '4', disabled: false, default: false },
  { label: '6 hours', value: '6', disabled: false, default: false },
  { label: '12 hours', value: '12', disabled: false, default: false },
  { label: '24 hours', value: '24', disabled: false, default: true },
  { label: '48 hours', value: '48', disabled: false, default: false },
  { label: '72 hours', value: '72', disabled: false, default: false },
] as const;
const trailingWindowOptionsDaily = [
  // { label: '3 days', value: '3', disabled: false, default: false },
  { label: '7 days', value: '7', disabled: false, default: true },
  { label: '14 days', value: '14', disabled: false, default: false },
  { label: '30 days', value: '30', disabled: false, default: false },
  { label: '60 days', value: '60', disabled: false, default: false },
  { label: '90 days', value: '90', disabled: false, default: false },
] as const;
const trailingWindowOptionsWeekly = [
  { label: '4 weeks', value: '4', disabled: false, default: true },
  { label: '8 weeks', value: '8', disabled: false, default: false },
  { label: '12 weeks', value: '12', disabled: false, default: false },
  { label: '24 weeks', value: '24', disabled: false, default: false },
] as const;
const trailingWindowOptionsMonthly = [
  { label: '4 months', value: '4', disabled: false, default: true },
  { label: '6 months', value: '6', disabled: false, default: false },
  { label: '7 months', value: '7', disabled: false, default: false },
  { label: '9 months', value: '9', disabled: false, default: false },
  { label: '12 months', value: '12', disabled: false, default: false },
] as const;
export const trailingWindowOptionsArray = [
  trailingWindowOptionsHourly,
  trailingWindowOptionsDaily,
  trailingWindowOptionsWeekly,
  trailingWindowOptionsMonthly,
] as const;
export const trailingWindowOptions: {
  [key in Granularity]:
    | typeof trailingWindowOptionsHourly
    | typeof trailingWindowOptionsDaily
    | typeof trailingWindowOptionsWeekly
    | typeof trailingWindowOptionsMonthly;
} = {
  hourly: trailingWindowOptionsHourly,
  daily: trailingWindowOptionsDaily,
  weekly: trailingWindowOptionsWeekly,
  monthly: trailingWindowOptionsMonthly,
} as const;
export type TrailingWindowOption = typeof trailingWindowOptionsArray[number][number]['value'];

// phase IV - card I
export const severityOptions = [
  { value: 3, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 1, label: 'High' },
] as const;
export type SeverityOption = typeof severityOptions[number]['value'];

// phase IV - card III
export type NotificationsModeOption = Monitor['mode']['type'];
export const notificationsModeOptions: readonly {
  value: NotificationsModeOption;
  label: string;
  shortDescription: string;
  tooltip?: string;
}[] = [
  {
    value: 'DIGEST',
    label: 'A digest notification summarizing anomalies in the last monitor run',
    tooltip: 'A digest notification summarizing anomalies in the last monitor run',
    shortDescription: 'A summary digest sent after each monitor run',
  },
  {
    value: 'EVERY_ANOMALY',
    label: 'One notification for every anomaly',
    tooltip: 'One notification for every anomaly',
    shortDescription: 'Sent for every anomaly',
  },
] as const;

export type MetricTypeInUse =
  | ModelClassificationValues
  | ModelRegressionValues
  | DriftMetricOption
  | DataQualityMetrics // DatasetMetric fraction
  | string; // used to handle perf metrics
export type AnalyzerConfig = Analyzer['config'];

export type BaselineAnalyzerConfig = Extends<
  Analyzer['config'],
  | DiffConfig
  | ComparisonConfig
  | ColumnListChangeConfig
  | StddevConfig
  | DriftConfig
  | ExperimentalConfig
  | SeasonalConfig
  | ListComparisonConfig
  | FrequentStringComparisonConfig
>;

export const getMetricCategory = (metric: DatasetMetric | SimpleColumnMetric | string): UseCaseOption => {
  switch (metric) {
    case 'count_null':
    case 'count':
    case 'count_bool':
    case 'count_integral':
    case 'count_string':
    case 'count_fractional':
    case 'unique_est':
    case 'min':
    case 'quantile_5':
    case 'quantile_25':
    case 'median':
    case 'quantile_75':
    case 'quantile_95':
    case 'quantile_99':
    case 'max':
    case 'stddev':
    case 'mean':
    case 'unique_lower':
    case 'unique_upper':
      return useCaseOptions[1].value;
    case 'classification.accuracy':
    case 'classification.precision':
    case 'classification.fpr':
    case 'classification.auroc':
    case 'classification.recall':
    case 'classification.f1':
    case 'regression.mae':
    case 'regression.rmse':
    case 'regression.mse':
      return useCaseOptions[2].value;
    default:
      return useCaseOptions[0].value;
  }
};

export function isDiffConfig(config: AnalyzerConfig): config is DiffConfig {
  return config.type === 'diff';
}
export function isFixedThresholdsConfig(config: AnalyzerConfig): config is FixedThresholdsConfig {
  return config.type === 'fixed';
}
export function isStddevConfig(config: AnalyzerConfig): config is StddevConfig {
  return config.type === 'stddev';
}
export function isDriftConfig(config: AnalyzerConfig): config is DriftConfig {
  return config.type === 'drift';
}
