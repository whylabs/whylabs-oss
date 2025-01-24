import { AnalysisDataFragment, AnalysisMetric, AnalysisResult, TimePeriod } from 'generated/graphql';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import {
  Analyzer,
  ConjunctionConfig,
  DisjunctionConfig,
  FixedThresholdsConfig,
  MonotonicConfig,
} from 'generated/monitor-schema';
import { MonitorSchema } from 'monitor-schema-types';
import { friendlyFormat } from './numberUtils';
import { createFrequentStringsEventDescription } from './createAlerts';
import { CardType } from '../components/cards/why-card/types';
import { isExactlyNullOrUndefined } from './nullUtils';
import { batchFrequencyToUnitText } from './timeUtils';
import { upperCaseFirstLetterOnly } from './stringUtils';
import { granularityToTimePeriod } from './timePeriodUtils';

export function getThresholdUpper(anomaly: AnalysisResult | undefined | null): number | undefined | null {
  if (anomaly === undefined || anomaly === null) {
    return null;
  }
  if (anomaly.analyzerType === 'comparison') {
    return undefined;
  }
  if (anomaly.analyzerType === 'fixed') {
    return anomaly.threshold_absoluteUpper;
  }
  if (anomaly.analyzerType === 'seasonal' || anomaly.analyzerType === 'stddev') {
    return anomaly.threshold_calculatedUpper;
  }
  if (anomaly.analyzerType === 'diff') {
    return anomaly.threshold_calculatedUpper;
  }
  return undefined;
}

export function getThresholdLower(anomaly: AnalysisResult | undefined | null): number | undefined | null {
  if (anomaly === undefined || anomaly === null) {
    return null;
  }
  if (anomaly.analyzerType === 'comparison') {
    return undefined;
  }
  if (anomaly.analyzerType === 'fixed') {
    return anomaly.threshold_absoluteLower;
  }
  if (anomaly.analyzerType === 'seasonal' || anomaly.analyzerType === 'stddev') {
    return anomaly.threshold_calculatedLower;
  }
  if (anomaly.analyzerType === 'diff') {
    return anomaly.threshold_calculatedLower;
  }
  return undefined;
}

export function hasAtLeastOneThreshold(analysisResult: AnalysisResult | undefined | null): boolean {
  return !(
    isExactlyNullOrUndefined(getThresholdLower(analysisResult)) &&
    isExactlyNullOrUndefined(getThresholdUpper(analysisResult))
  );
}

export function getAlertingThreshold(anomaly: AnalysisDataFragment): 'lower' | 'upper' | 'diff' | undefined {
  if (!anomaly.isAnomaly) {
    return undefined;
  }
  if (anomaly.analyzerType === 'fixed') {
    if (
      typeof anomaly.threshold_metricValue === 'number' &&
      typeof anomaly.threshold_absoluteLower === 'number' &&
      anomaly.threshold_metricValue <= anomaly.threshold_absoluteLower
    ) {
      return 'lower';
    }
    if (
      typeof anomaly.threshold_metricValue === 'number' &&
      typeof anomaly.threshold_absoluteUpper === 'number' &&
      anomaly.threshold_metricValue >= anomaly.threshold_absoluteUpper
    ) {
      return 'upper';
    }
  }
  if (anomaly.analyzerType === 'seasonal' || anomaly.analyzerType === 'stddev') {
    if (
      typeof anomaly.threshold_metricValue === 'number' &&
      typeof anomaly.threshold_calculatedLower === 'number' &&
      anomaly.threshold_metricValue <= anomaly.threshold_calculatedLower
    ) {
      return 'lower';
    }
    if (
      typeof anomaly.threshold_metricValue === 'number' &&
      typeof anomaly.threshold_calculatedUpper === 'number' &&
      anomaly.threshold_metricValue >= anomaly.threshold_calculatedUpper
    ) {
      return 'upper';
    }
  }
  if (anomaly.analyzerType === 'diff') {
    return 'diff';
  }

  return undefined;
}

function generateFailureExplanation(analysis: AnalysisDataFragment): string {
  return `Analysis failed: ${analysis.failureType} ${
    analysis.failureExplanation ? `- ${analysis.failureExplanation}` : ''
  }`;
}

function generateDriftDescription(analysis: AnalysisDataFragment, decimals?: number): string {
  if (analysis.analyzerType === 'drift') {
    let metric: number | string | undefined | null = analysis.drift_metricValue;
    let threshold: number | string | undefined | null = analysis.drift_threshold;
    if (decimals) {
      metric = metric && friendlyFormat(metric, decimals);
      threshold = threshold && friendlyFormat(threshold, decimals);
    }
    return `Drift of ${metric} ${analysis.isAnomaly ? `> ${threshold} threshold` : `is within ${threshold} threshold`}`;
  }
  return '';
}

function isMonotonicConfig(config: Analyzer['config'] | null | undefined): config is MonotonicConfig {
  if (!config) return false;
  return 'direction' in config;
}

function getBucketNames(batchFrequency?: TimePeriod, schema?: MonitorSchema): readonly [string, string] {
  const usedBatchFrequency = batchFrequency ?? granularityToTimePeriod(schema?.granularity);
  const bucketName = usedBatchFrequency ? batchFrequencyToUnitText(usedBatchFrequency) : 'batch';
  // fortunately, day, hour, week, and month all form plurals just by adding an s
  const bucketsName = bucketName === 'batch' ? 'batches' : `${bucketName}s`;

  return [bucketName, bucketsName] as const;
}

function generateMonotonicAnomalyDescription(
  analysis: AnalysisDataFragment,
  schema?: MonitorSchema,
  batchFrequency?: TimePeriod,
): string {
  if (analysis.analyzerType === 'monotonic') {
    const threshold = analysis.threshold_absoluteUpper;
    const value = analysis.threshold_metricValue;
    const analyzer = schema?.analyzers.find((a) => a.id === analysis.analyzerId) ?? null;
    const targetSize = analyzer?.targetSize ?? null;
    const direction = isMonotonicConfig(analyzer?.config) ? analyzer?.config.direction : null;
    const [bucketName, bucketsName] = getBucketNames(batchFrequency, schema);

    if (direction && !isExactlyNullOrUndefined(targetSize)) {
      const action = threshold === value ? 'meets' : 'exceeds';
      const errorAction = direction === 'INCREASING' ? 'increase' : 'decrease';
      const errorActions = `${errorAction}s`;
      const errorActionWord = value === 1 ? errorAction : errorActions;
      if (threshold === 1) {
        return targetSize === 1
          ? `${upperCaseFirstLetterOnly(errorActionWord)} detected from previous ${bucketName}`
          : `${value} ${errorActionWord} detected within previous ${targetSize} ${bucketsName}`;
      }
      return `${value} ${errorActionWord} within ${targetSize} ${bucketsName} ${action} threshold of ${threshold}`;
    }

    return `Sequence of length ${value} met threshold of ${threshold}`;
  }
  return '';
}

function isFixedThresholdsConfigWithConsecutive(
  config: Analyzer['config'] | null | undefined,
): config is FixedThresholdsConfig {
  if (!config) return false;
  return 'nConsecutive' in config;
}

function getNConsecutiveThreshold(analysis: AnalysisDataFragment, schema?: MonitorSchema): number | undefined {
  if (analysis.analyzerType === 'fixed') {
    const analyzer = schema?.analyzers.find((a) => a.id === analysis.analyzerId) ?? null;
    if (isFixedThresholdsConfigWithConsecutive(analyzer?.config)) {
      return analyzer?.config.nConsecutive ?? undefined;
    }
  }
  return undefined;
}

export function generateFixedThresholdAnomalyDescription(
  analysis: AnalysisDataFragment,
  schema?: MonitorSchema,
  decimals?: number,
  batchFrequency?: TimePeriod,
): string {
  const [, bucketsName] = getBucketNames(batchFrequency, schema);
  const metric: number | string | undefined | null = analysis.threshold_metricValue;
  const lower: number | string | undefined | null = analysis.threshold_absoluteLower;
  const upper: number | string | undefined | null = analysis.threshold_absoluteUpper;
  const consecutive = getNConsecutiveThreshold(analysis, schema);
  const useConsecutive = consecutive ?? 0 > 1;
  let message = `Observed value ${friendlyFormat(metric, decimals)} `;
  if (getAlertingThreshold(analysis) === 'lower') {
    message += `< ${friendlyFormat(lower, decimals)} threshold`;
  }
  if (getAlertingThreshold(analysis) === 'upper') {
    message += `> ${friendlyFormat(upper, decimals)} threshold`;
  }
  if (useConsecutive) {
    message += ` for at least ${consecutive} ${bucketsName}`;
  }
  return message;
}

function generateDiffDescription(analysis: AnalysisDataFragment, decimals?: number): string {
  if (analysis.analyzerType === 'diff') {
    let metric: number | string | undefined | null = analysis.diff_metricValue;
    let threshold: number | string | undefined | null = analysis.diff_threshold;
    if (decimals) {
      metric = metric && friendlyFormat(metric, decimals);
      threshold = threshold && friendlyFormat(threshold, decimals);
    }
    if (analysis.diff_mode === 'pct') {
      return `Percentage difference of ${metric}% ${
        analysis.isAnomaly ? `> ${threshold}% change from baseline` : `is within ${threshold}% threshold`
      }`;
    }
    return `Difference value of ${metric} ${
      analysis.isAnomaly ? `> ${threshold} threshold` : `is within ${threshold} threshold`
    }`;
  }
  return '';
}

function generateFixedTypeDescription(analysis: AnalysisDataFragment, decimals?: number): string {
  if (analysis.analyzerType === 'fixed') {
    const metric: number | string | undefined | null = analysis.threshold_metricValue;
    const lower: number | string | undefined | null = analysis.threshold_absoluteLower;
    const upper: number | string | undefined | null = analysis.threshold_absoluteUpper;
    let description = `Observed value ${friendlyFormat(metric, decimals)} `;
    if (!analysis.isAnomaly) {
      description += 'is within range';
      return description;
    }
    if (getAlertingThreshold(analysis) === 'lower') {
      description += `< ${friendlyFormat(lower, decimals)} threshold`;
      return description;
    }
    if (getAlertingThreshold(analysis) === 'upper') {
      description += `> ${friendlyFormat(upper, decimals)} threshold`;
      return description;
    }
  }
  return '';
}

function generateSeasonalOrStdDevDescription(analysis: AnalysisDataFragment, decimals?: number): string {
  if (analysis.analyzerType === 'seasonal' || analysis.analyzerType === 'stddev') {
    const metric: number | string | undefined | null = analysis.threshold_metricValue;
    const lower: number | string | undefined | null = analysis.threshold_calculatedLower;
    const upper: number | string | undefined | null = analysis.threshold_calculatedUpper;
    let description = `Observed value ${friendlyFormat(metric, decimals)} `;
    if (!analysis.isAnomaly) {
      description += 'is within range';
      return description;
    }
    if (getAlertingThreshold(analysis) === 'lower') {
      description += `< ${friendlyFormat(lower, decimals)} threshold`;
      return description;
    }
    if (getAlertingThreshold(analysis) === 'upper') {
      description += `> ${friendlyFormat(upper, decimals)} threshold`;
      return description;
    }
  }
  return '';
}

function generateComparisonDescription(analysis: AnalysisDataFragment): string {
  if (analysis.analyzerType === 'comparison' && analysis.metric === AnalysisMetric.InferredDataType) {
    if (analysis.isAnomaly) {
      return `Inferred data type changed from ${analysis.comparison_expected?.toLowerCase()} to ${analysis.comparison_observed?.toLowerCase()}`;
    }
    return `Inferred data type ${analysis.comparison_observed?.toLowerCase()} is unchanged`;
  }
  return '';
}

function generateListComparisonDescription(analysis: AnalysisDataFragment): string {
  if (analysis.analyzerType === 'list_comparison') {
    if (analysis.isAnomaly) {
      return `Observed value ${analysis.comparison_observed?.toLowerCase()} is not in the specified list`;
    }
    return `Observed value ${analysis.comparison_observed?.toLowerCase()} is in the specified list`;
  }
  return ``;
}

function generateFrequentStringComparisonDescription(analysis: AnalysisDataFragment): string {
  if (analysis.analyzerType === 'frequent_string_comparison') {
    return createFrequentStringsEventDescription(analysis);
  }
  return ``;
}

export function generateEventDescription(analysis: AnalysisDataFragment, decimals?: number): string {
  if (analysis.isAnomaly) {
    // TODO: eventually swap out all of the logic to the individual functions
    return generateAnomalyExplanation(analysis, { decimals });
  }

  if (analysis.failureType) {
    return generateFailureExplanation(analysis);
  }

  if (analysis.analyzerType === 'drift') {
    return generateDriftDescription(analysis, decimals);
  }
  if (analysis.analyzerType === 'diff') {
    return generateDiffDescription(analysis, decimals);
  }
  if (analysis.analyzerType === 'fixed') {
    return generateFixedTypeDescription(analysis, decimals);
  }
  if (analysis.analyzerType === 'seasonal' || analysis.analyzerType === 'stddev') {
    return generateSeasonalOrStdDevDescription(analysis, decimals);
  }
  if (analysis.analyzerType === 'comparison' && analysis.metric === AnalysisMetric.InferredDataType) {
    return generateComparisonDescription(analysis);
  }
  if (analysis.analyzerType === 'list_comparison') {
    return generateListComparisonDescription(analysis);
  }
  if (analysis.analyzerType === 'frequent_string_comparison') {
    return generateFrequentStringComparisonDescription(analysis);
  }
  return '';
}

interface AnomalyExplanationOptions {
  decimals?: number;
  schema?: MonitorSchema;
  batchFrequency?: TimePeriod;
}

export function generateAnomalyExplanation(
  anomaly: AnalysisDataFragment,
  options: AnomalyExplanationOptions = {},
): string {
  if (!anomaly.isAnomaly) {
    return ``;
  }

  const { decimals, schema, batchFrequency } = options;

  if (anomaly.analyzerType === 'monotonic') {
    return generateMonotonicAnomalyDescription(anomaly, schema, batchFrequency); // No decimals are needed because this is only for count metrics
  }
  if (anomaly.analyzerType === 'drift') {
    return generateDriftDescription(anomaly, decimals);
  }
  if (anomaly.analyzerType === 'diff') {
    let metric: number | string | undefined | null = anomaly.diff_metricValue;
    let threshold: number | string | undefined | null = anomaly.diff_threshold;
    if (decimals) {
      metric = metric && friendlyFormat(metric, decimals);
      threshold = threshold && friendlyFormat(threshold, decimals);
    }
    if (anomaly.diff_mode === 'pct') {
      return `Percentage difference of ${metric}% > ${threshold}% change from baseline `;
    }
    return `Difference value of ${metric} > ${threshold} threshold`;
  }
  if (anomaly.analyzerType === 'fixed') {
    return generateFixedThresholdAnomalyDescription(anomaly, schema, decimals, batchFrequency);
  }
  if (anomaly.analyzerType === 'seasonal' || anomaly.analyzerType === 'stddev') {
    const metric: number | string | undefined | null = anomaly.threshold_metricValue;
    const lower: number | string | undefined | null = anomaly.threshold_calculatedLower;
    const upper: number | string | undefined | null = anomaly.threshold_calculatedUpper;
    let string = `Observed value ${friendlyFormat(metric, decimals)} `;
    if (getAlertingThreshold(anomaly) === 'lower') {
      string += `< ${friendlyFormat(lower, decimals)} threshold`;
      return string;
    }
    if (getAlertingThreshold(anomaly) === 'upper') {
      string += `> ${friendlyFormat(upper, decimals)} threshold`;
      return string;
    }
  }
  if (anomaly.analyzerType === 'comparison' && anomaly.metric === AnalysisMetric.InferredDataType) {
    return `Inferred data type changed from ${anomaly.comparison_expected?.toLowerCase()} to ${anomaly.comparison_observed?.toLowerCase()}`;
  }
  if (anomaly.analyzerType === 'list_comparison') {
    return `Observed value ${anomaly.comparison_observed?.toLowerCase()} is not in the specified list`;
  }
  if (anomaly.analyzerType === 'frequent_string_comparison') {
    return generateFrequentStringComparisonDescription(anomaly);
  }
  return ``;
}

export const metricsToDecorationTypeMapper = new Map<AnalysisMetric, WhyCardDecorationType>([
  [AnalysisMetric.Histogram, 'est_quantile_drift'],
  [AnalysisMetric.FrequentItems, 'drift_top_five'],
  [AnalysisMetric.Median, 'single_values_est_median'],
  [AnalysisMetric.Mean, 'single_values_mean'],
  [AnalysisMetric.Min, 'single_values_min'],
  [AnalysisMetric.Max, 'single_values_max'],
  [AnalysisMetric.StdDev, 'single_values_stddev'],
  [AnalysisMetric.Quantile_99, 'single_values_q99'],
  [AnalysisMetric.Count, 'total_count'],
  [AnalysisMetric.UniqueEst, 'est_unique_values'],
  [AnalysisMetric.UniqueEstRatio, 'est_unique_ratio'],
  [AnalysisMetric.CountNull, 'est_missing_values'],
  [AnalysisMetric.CountNullRatio, 'est_missing_ratios'],
  [AnalysisMetric.InferredDataType, 'inferred_data_type'],
]);

export const decorationTypeToMetricsMapper = new Map<WhyCardDecorationType, AnalysisMetric[]>([
  ['est_quantile_drift', [AnalysisMetric.Histogram]],
  ['drift_top_five', [AnalysisMetric.FrequentItems]],
  ['single_values_est_median', [AnalysisMetric.Median]],
  ['single_values_mean', [AnalysisMetric.Mean]],
  ['single_values_min', [AnalysisMetric.Min]],
  ['single_values_max', [AnalysisMetric.Max]],
  ['single_values_stddev', [AnalysisMetric.StdDev]],
  ['single_values_q99', [AnalysisMetric.Quantile_99]],
  ['total_count', [AnalysisMetric.Count]],
  ['est_unique_values', [AnalysisMetric.UniqueEst]],
  ['est_unique_ratio', [AnalysisMetric.UniqueEstRatio]],
  ['est_missing_values', [AnalysisMetric.CountNull]],
  ['est_missing_ratios', [AnalysisMetric.CountNullRatio]],
  ['inferred_data_type', [AnalysisMetric.InferredDataType]],
  ['output_count', [AnalysisMetric.Count]],
]);

export const decorationTypeToITSDMetricsMapper = new Map<WhyCardDecorationType, AnalysisMetric[]>([
  ...decorationTypeToMetricsMapper.entries(),
  ['est_quantile_drift', [AnalysisMetric.Mean]],
  ['drift_top_five', [AnalysisMetric.Mean]],
]);

export const getDecorationTypeByMetric = (metric: AnalysisMetric): WhyCardDecorationType => {
  return metricsToDecorationTypeMapper.get(metric) ?? 'unknown';
};

const decorationTypeToCardTypeMapper = new Map<WhyCardDecorationType, CardType>([
  ['drift_top_five', 'drift'],
  ['est_quantile_drift', 'drift'],
  ['single_values_est_median', 'singleValues'],
  ['single_values_mean', 'singleValues'],
  ['single_values_min', 'singleValues'],
  ['single_values_max', 'singleValues'],
  ['single_values_stddev', 'singleValues'],
  ['single_values_q99', 'singleValues'],
  ['est_missing_values', 'missingValues'],
  ['est_missing_ratios', 'missingValues'],
  ['est_unique_values', 'uniqueValues'],
  ['est_unique_ratio', 'uniqueValues'],
  ['inferred_data_type', 'schema'],
  ['total_count', 'totalCount'],
  ['output_count', 'output'],
]);

export const cardTypeToAnalysisMetrics = new Map<CardType, AnalysisMetric[]>([
  ['drift', [AnalysisMetric.Histogram, AnalysisMetric.FrequentItems]],
  ['missingValues', [AnalysisMetric.CountNull, AnalysisMetric.CountNullRatio]],
  ['uniqueValues', [AnalysisMetric.UniqueEst, AnalysisMetric.UniqueEstRatio]],
  [
    'singleValues',
    [
      AnalysisMetric.Median,
      AnalysisMetric.Min,
      AnalysisMetric.Max,
      AnalysisMetric.Mean,
      AnalysisMetric.StdDev,
      AnalysisMetric.Quantile_99,
    ],
  ],
  ['schema', [AnalysisMetric.InferredDataType]],
]);

export const getCardTypeTypeByDecoration = (decoration: WhyCardDecorationType): CardType | undefined => {
  return decorationTypeToCardTypeMapper.get(decoration);
};

export const getThresholdDomain = (data?: AnalysisDataFragment[]): number[] => {
  let maxThreshold: number | null = null;
  let minThreshold: number | null = null;

  data?.forEach((an) => {
    const upper = getThresholdUpper(an) ?? null;
    if (upper !== null && (!maxThreshold || upper > maxThreshold)) {
      maxThreshold = upper;
    }

    const lower = getThresholdLower(an) ?? null;
    if (lower !== null && (!minThreshold || lower < minThreshold)) {
      minThreshold = lower;
    }
  });
  const values: number[] = [];
  if (minThreshold !== null) values.push(minThreshold);
  if (maxThreshold !== null) values.push(maxThreshold);
  return values;
};

export type AnalyzerMetric = Exclude<Analyzer['config'], ConjunctionConfig | DisjunctionConfig>['metric'];

export const getAnalysisMetricByAnalyzerConfigMetric = (metric: AnalyzerMetric): AnalysisMetric => {
  const normalizedMetric = metric.toLowerCase().replaceAll('.', '_');
  return mapAnalyzerMetricToAnalysisMetric.get(normalizedMetric) ?? AnalysisMetric.Unknown;
};

const mapAnalyzerMetricToAnalysisMetric = new Map<AnalyzerMetric, AnalysisMetric>([
  ['classification_accuracy', AnalysisMetric.ClassificationAccuracy],
  ['classification_recall', AnalysisMetric.ClassificationRecall],
  ['classification_fpr', AnalysisMetric.ClassificationFpr],
  ['classification_precision', AnalysisMetric.ClassificationPrecision],
  ['classification_f1', AnalysisMetric.ClassificationF1],
  ['classification_auroc', AnalysisMetric.ClassificationAuroc],
  ['histogram', AnalysisMetric.Histogram],
  ['frequent_items', AnalysisMetric.FrequentItems],
  ['profile_count', AnalysisMetric.ProfileCount],
  ['profile_last_ingestion_time', AnalysisMetric.ProfileLastIngestionTime],
  ['profile_first_ingestion_time', AnalysisMetric.ProfileFirstIngestionTime],
  ['input_count', AnalysisMetric.InputCount],
  ['output_count', AnalysisMetric.OutputCount],
  ['regression_mse', AnalysisMetric.RegressionMse],
  ['regression_mae', AnalysisMetric.RegressionMae],
  ['regression_rmse', AnalysisMetric.RegressionRmse],
  ['count', AnalysisMetric.Count],
  ['median', AnalysisMetric.Median],
  ['min', AnalysisMetric.Min],
  ['max', AnalysisMetric.Max],
  ['mean', AnalysisMetric.Mean],
  ['stddev', AnalysisMetric.StdDev],
  ['variance', AnalysisMetric.Variance],
  ['unique_upper', AnalysisMetric.UniqueUpper],
  ['unique_upper_ratio', AnalysisMetric.UniqueUpperRatio],
  ['unique_est', AnalysisMetric.UniqueEst],
  ['unique_est_ratio', AnalysisMetric.UniqueEstRatio],
  ['unique_lower', AnalysisMetric.UniqueLower],
  ['unique_lower_ratio', AnalysisMetric.UniqueLowerRatio],
  ['count_bool', AnalysisMetric.CountBool],
  ['count_bool_ratio', AnalysisMetric.CountBoolRatio],
  ['count_integral', AnalysisMetric.CountIntegral],
  ['count_integral_ratio', AnalysisMetric.CountIntegralRatio],
  ['count_fractional', AnalysisMetric.CountFractional],
  ['count_fractional_ratio', AnalysisMetric.CountFractionalRatio],
  ['count_string', AnalysisMetric.CountString],
  ['count_string_ratio', AnalysisMetric.CountStringRatio],
  ['count_null', AnalysisMetric.CountNull],
  ['count_null_ratio', AnalysisMetric.CountNullRatio],
  ['inferred_data_type', AnalysisMetric.InferredDataType],
  ['quantile_75', AnalysisMetric.Quantile_75],
  ['quantile_25', AnalysisMetric.Quantile_25],
  ['quantile_90', AnalysisMetric.Quantile_90],
  ['quantile_99', AnalysisMetric.Quantile_99],
  ['quantile_5', AnalysisMetric.Quantile_5],
  ['quantile_95', AnalysisMetric.Quantile_95],
  ['column_row_count_sum', AnalysisMetric.ColumnRowCountSum],
  ['shape_column_count', AnalysisMetric.ShapeColumnCount],
  ['shape_row_count', AnalysisMetric.ShapeRowCount],
  ['secondsSinceLastUpload', AnalysisMetric.SecondsSinceLastUpload],
  ['missingDatapoint', AnalysisMetric.MissingDatapoint],
  ['predictionCount', AnalysisMetric.PredictionCount],
]);
