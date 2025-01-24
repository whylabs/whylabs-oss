import { TimeSeriesResult, TimeSeriesResultMetricEntry } from '@whylabs/data-service-node-client';
import { get, sortBy } from 'lodash';

import { classificationMetrics, regressionMetrics } from '../../../services/data/data-service/data-service-types';
import { GetMetricRollupRequest } from '../../../services/data/data-service/queries/numeric-metrics-queries';
import {
  AnalysisMetric,
  FloatDataPoint,
  MetricQuery,
  MetricResult,
  MetricRollupResult,
  SegmentTag,
} from '../../generated/graphql';

export const DatasetMetricFeature = '__internal__.datasetMetrics';

// In the following, Columns are metric fields returned by the druid response, whether its in the rollup table or via
// aggregations. We treat perf metrics separately because getCombinedAggregations doesn't support them.
// At some point, we may want to update getCombinedAggregations so that it does.
export const supportedNonPerformanceColumns = [
  'counters.count',
  'schema.count.BOOLEAN',
  'schema.count.FRACTIONAL',
  'schema.count.INTEGRAL',
  'schema.count.NULL',
  'schema.count.STRING',
  'schema.count.UNKNOWN',
  'number.max',
  'number.min',
] as const;
const supportedPerformanceColumns = [...classificationMetrics, ...regressionMetrics, 'count'] as const;
export const supportedNumericColumns = [...supportedNonPerformanceColumns, ...supportedPerformanceColumns];

// The following columns need additional processing to extract multiple possible numeric metrics from the field in the
// druid response.
const nonPerformanceComplexColumns = ['uniqueCount', 'variance', 'histogram'] as const;
const performanceComplexColumns = ['modelMetrics'] as const;
const supportedComplexColumns = [...nonPerformanceComplexColumns, ...performanceComplexColumns];

export type SupportedColumn =
  | (typeof supportedNumericColumns)[number]
  | (typeof supportedComplexColumns)[number]
  | (typeof supportedPerformanceColumns)[number];

// The following are the numeric metrics extracted from the complex metrics either by the post-aggregations or by
// calculation in dashbird.
const derivedNumericResults = [
  'unique_est',
  'unique_lower',
  'unique_upper',
  'unique_est_ratio',
  'count_null_ratio',
  'mean',
  'stddev',
  'quantile_5',
  'quantile_25',
  'median',
  'quantile_75',
  'quantile_95',
  'quantile_99',
  'prediction_count',
] as const;

// SupportedResults are the metrics available to be returned from the data source after cleaning and processing the
// query results. This includes the non-complex columns and the derived metrics.
export type SupportedResult =
  | (typeof supportedNumericColumns)[number]
  | (typeof derivedNumericResults)[number]
  | (typeof supportedPerformanceColumns)[number];

type SupportedResultColumn = SupportedColumn & SupportedResult;

// This map is used to convert between the requested metric and the matching column in the dataservice response
const metricToColumnMap = new Map<AnalysisMetric, SupportedResultColumn>([
  [AnalysisMetric.CountNull, 'schema.count.NULL'],
  [AnalysisMetric.Count, 'counters.count'],
  [AnalysisMetric.CountBool, 'schema.count.BOOLEAN'],
  [AnalysisMetric.CountIntegral, 'schema.count.INTEGRAL'],
  [AnalysisMetric.CountString, 'schema.count.STRING'],
  [AnalysisMetric.CountFractional, 'schema.count.FRACTIONAL'],
  [AnalysisMetric.Min, 'number.min'],
  [AnalysisMetric.Max, 'number.max'],
  [AnalysisMetric.ClassificationAccuracy, 'accuracy'],
  [AnalysisMetric.ClassificationPrecision, 'precision'],
  [AnalysisMetric.ClassificationRecall, 'recall'],
  [AnalysisMetric.ClassificationF1, 'f1'],
  [AnalysisMetric.ClassificationFpr, 'fpr'],
  [AnalysisMetric.ClassificationAuroc, 'macroAuc'],
  // [AnalysisMetric.ClassificationAupr, 'aupr'],
  [AnalysisMetric.RegressionMae, 'mean_absolute_error'],
  [AnalysisMetric.RegressionMse, 'mean_squared_error'],
  [AnalysisMetric.RegressionRmse, 'root_mean_squared_error'],
]);

// This map is used to convert between the requested derived metric and the complex columns it is derived from
const derivedMetricColumnMap = new Map<AnalysisMetric, SupportedColumn[]>([
  [AnalysisMetric.UniqueEst, ['uniqueCount']],
  [AnalysisMetric.UniqueLower, ['uniqueCount']],
  [AnalysisMetric.UniqueUpper, ['uniqueCount']],
  [AnalysisMetric.UniqueEstRatio, ['uniqueCount', 'counters.count']],
  [AnalysisMetric.CountNullRatio, ['schema.count.NULL', 'counters.count']],
  [AnalysisMetric.StdDev, ['variance']],
  [AnalysisMetric.Mean, ['variance']],
  [AnalysisMetric.Median, ['histogram']],
  [AnalysisMetric.Quantile_5, ['histogram']],
  [AnalysisMetric.Quantile_25, ['histogram']],
  [AnalysisMetric.Quantile_75, ['histogram']],
  [AnalysisMetric.Quantile_95, ['histogram']],
  [AnalysisMetric.Quantile_99, ['histogram']],
  [AnalysisMetric.PredictionCount, ['modelMetrics', 'count']], // modelMetrics for classification, count for regression
]);

// These are the metrics that can be requested in the graphql query
export const supportedNumericMetrics = new Set([...metricToColumnMap.keys(), ...derivedMetricColumnMap.keys()]);
export const isSupportedNumericMetric = (m: AnalysisMetric): boolean => supportedNumericMetrics.has(m);
const supportedDistributionMetrics = new Set([AnalysisMetric.FrequentItems]);
export const isSupportedDistributionMetric = (m: AnalysisMetric): boolean => supportedDistributionMetrics.has(m);

export type ActualFeatureRollup = {
  type_double: {
    [key: string]: number | undefined;
  };
};

export type ActualModelRollup = {
  datasetId: string;
  timestamp?: number;
  segmentKeyValue?: string;
  referenceId?: string;
  features: {
    [key: string]: ActualFeatureRollup | undefined;
  };
};

const modelRollupToFloatDataPoint = (
  rollup: ActualModelRollup,
  feature: string,
  metric: string,
): FloatDataPoint | undefined => {
  const maybeMetricValue = get(rollup.features, [feature, 'type_double', metric]);
  const lastUploadTimestamp = get(rollup.features, [feature, 'type_long', 'whylabs/last_upload_ts']);
  if (typeof maybeMetricValue !== 'number' || rollup.timestamp === undefined) return undefined;
  return {
    timestamp: rollup.timestamp,
    lastUploadTimestamp: lastUploadTimestamp,
    value: maybeMetricValue,
  };
};

export const numericMetricsToGql = (
  queries: MetricQuery[],
  rollups: ActualModelRollup[],
  segment: SegmentTag[] = [],
): MetricResult[] => {
  const results: MetricResult[] = queries.map((q) => ({
    datasetId: q.datasetId,
    metric: q.metric,
    points: [],
    segment,
    feature: q.feature ?? DatasetMetricFeature,
  }));
  results.forEach((res) => {
    const modelRollups: ActualModelRollup[] = rollups.filter((r) => res.datasetId == r.datasetId);
    // pull out points for which there is data
    const points = modelRollups.flatMap((r) => {
      // dataset metrics are indexed with empty string
      const dsFeature = res.feature === DatasetMetricFeature ? '' : res.feature;
      const maybeDataPoint = modelRollupToFloatDataPoint(r, dsFeature, res.metric.toLowerCase());
      return maybeDataPoint === undefined ? [] : [maybeDataPoint];
    });

    res.points = sortBy(points, 'timestamp');
  });
  return results;
};

export const timeseriesMetricsToGql = (
  queries: MetricQuery[],
  timeseriesResults: TimeSeriesResult[],
  segment: SegmentTag[] = [],
  overrideStamp: number | null = null, // for granularity 'all', so we can set the timestamp to the start of the range
): MetricResult[] => {
  const results: MetricResult[] = [];
  queries.forEach((q, index) => {
    const maybeResult = timeseriesResults.find((r) => r.id === `q${index}`);
    const pointsWithData = maybeResult?.data?.filter((d) => d.value !== undefined) ?? [];
    results.push({
      datasetId: q.datasetId,
      metric: q.metric,
      points: sanitizeTimeSeriesEntries(pointsWithData).map((d) => ({
        value: d.value,
        lastUploadTimestamp: d.lastUploadTimestamp,
        timestamp: overrideStamp ?? d.timestamp ?? 0,
      })),
      segment,
      feature: q.feature ?? DatasetMetricFeature,
    });
  });
  return results;
};

export const sanitizeTimeSeriesEntries = (
  entries: TimeSeriesResultMetricEntry[],
  overrideStamp: number | null = null, // for granularity 'all', so we can set the timestamp to the start of the range
): FloatDataPoint[] => {
  const result: FloatDataPoint[] = [];
  entries.forEach((d) => {
    if (Number.isFinite(d.value)) {
      result.push({
        value: d.value ?? 0, // default should not happen due to isFinite check
        lastUploadTimestamp: d.lastModified,
        timestamp: overrideStamp ?? d.timestamp ?? 0,
      });
    }
  });

  return result;
};

export const timeseriesMetricsForSegmentToGql = (
  params: GetMetricRollupRequest,
  results: TimeSeriesResult[],
): MetricRollupResult[] => {
  const gqlResults: MetricRollupResult[] = [];
  const { datasetId, metric, column, segments } = params;
  segments.forEach((segment, index) => {
    const maybeResult = results.find((r) => r.id === `q${index}`);
    if (maybeResult) {
      const maybeMetricValue = maybeResult.data?.length ? maybeResult.data[0].value : undefined;
      if (typeof maybeMetricValue === 'number') {
        gqlResults.push({
          datasetId,
          metric,
          feature: column ?? DatasetMetricFeature,
          value: maybeMetricValue,
          segmentGroup: segment[0].value,
        });
      }
    }
  });
  return gqlResults;
};
