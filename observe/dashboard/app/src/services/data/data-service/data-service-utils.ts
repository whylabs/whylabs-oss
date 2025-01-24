import { BuiltinProfileMetric, DataGranularity } from '@whylabs/data-service-node-client';
import { SegmentTag } from '@whylabs/songbird-node-client';

import { MAX_DAYS_PER_MONTH, MILLIS_PER_DAY, MILLIS_PER_HOUR, MILLIS_PER_WEEK } from '../../../constants';
import { DateRange, MetricQuery, TimePeriod } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
import { WhyLabsCallContext, formatContext } from '../../../util/async-helpers';
import { InvalidTimeRangeError } from '../../errors/data-service-errors';
import { BuiltinMonitorMetric, BuiltinTraceMetric, TimeSeriesUnionQuery } from './queries/numeric-metrics-queries';

const logger = getLogger('DataServiceLogger');

/**
 * Convert GQL segment tags into a format that the data service can understand
 * @param tags
 * @returns A string representing a segment, e.g. key1=value1&key2=value2. Returns empty string if the tags array is empty.
 */
export const tagsToDataServiceSegment = (tags: SegmentTag[]): string => {
  return tags.map((tag) => `${tag.key}=${tag.value}`).join('&');
};

export const getDataServiceGranularity = (timePeriod: TimePeriod): DataGranularity => {
  switch (timePeriod) {
    case TimePeriod.P1M:
      return DataGranularity.Monthly;
    case TimePeriod.P1W:
      return DataGranularity.Weekly;
    case TimePeriod.P1D:
      return DataGranularity.Daily;
    case TimePeriod.Pt1H:
      return DataGranularity.Hourly;
    case TimePeriod.Individual:
      return DataGranularity.Individual;
    case TimePeriod.All:
      return DataGranularity.All;
    case TimePeriod.Unknown:
    default:
      throw Error(`Unknown or unsupported time period ${timePeriod}`);
  }
};

// converts timestamps in millis to a postgres interval
export const getInterval = (from: number, to?: number | null): string => {
  const intervalLimit = to ?? from;
  if (from > intervalLimit) {
    throw new InvalidTimeRangeError('Ending timestamp must be greater than the starting timestamp');
  }
  return `${new Date(from).toISOString()}/${new Date(intervalLimit).toISOString()}`;
};

export const intervalToDateRange = (interval: string): DateRange | null => {
  const [start, end] = interval.split('/');
  const fromTimestamp = new Date(start).getTime();
  const toTimestamp = new Date(end).getTime();
  if (!Number.isNaN(fromTimestamp) && !Number.isNaN(toTimestamp)) {
    return {
      fromTimestamp,
      toTimestamp,
    };
  }
  return null;
};

export const getIntervalWithDuration = (from: number, granularity: TimePeriod): string => {
  if ([TimePeriod.Individual, TimePeriod.Unknown, TimePeriod.All].includes(granularity)) {
    throw new InvalidTimeRangeError('Invalid time-period for ISO interval with duration');
  }
  return `${new Date(from).toISOString()}/${granularity}`;
};

export const timePeriodToMillis = (timePeriod: TimePeriod): number => {
  switch (timePeriod) {
    case TimePeriod.P1M:
      // NOTE: this is an approximation and will result in overfetching for some months. As
      // long as the query is based on the relevant granularity, this is the safer option to avoid
      // omitting data from a batch. This value should NOT be used to get an accurate end timestamp
      // for a batch rollup query.
      return Math.round(MAX_DAYS_PER_MONTH * MILLIS_PER_DAY);
    case TimePeriod.P1W:
      return MILLIS_PER_WEEK;
    case TimePeriod.P1D:
      return MILLIS_PER_DAY;
    case TimePeriod.Pt1H:
      return MILLIS_PER_HOUR;
    default:
      throw Error(`Unsupported time period ${timePeriod}`);
  }
};

/**
 * Returns the from/to timestamps in millis to capture just one bucket of the given TimePeriod size
 * NOTE: This is not accurate for monthly.
 * @param granularity Desired granularity
 * @param datasetTimestamp Starting timestamp
 */
export const getTimestampsForSingleBucket = (
  granularity: TimePeriod,
  datasetTimestamp: number,
): { fromTime: number; toTime: number } => ({
  fromTime: datasetTimestamp,
  toTime: datasetTimestamp + timePeriodToMillis(granularity),
});

export const truncateDatasetIds = (datasetIds: string[], num: number, context?: WhyLabsCallContext): string[] => {
  // truncate calls with more than specified number of models
  const truncatedIds = datasetIds.slice(0, num);
  if (datasetIds.length > num) {
    logger.warn(`${formatContext(context)}: called with ${datasetIds.length} datasets, truncating to 100`);
  }
  return truncatedIds;
};

const toMetricType = <T>(value: string, enumMap: { [p: string]: T }): T | null => {
  const match = Object.entries(enumMap).find(([, v]) => v === value);
  return match ? match[1] : null;
};

export const toBuiltinProfileMetric = (metric: string): BuiltinProfileMetric | undefined => {
  const normalizedVal = metric.valueOf().toLowerCase().replace(/\./g, '_');
  // Hopefully temporary workaround for mismatched metric names
  if (normalizedVal === 'classification_auroc') return BuiltinProfileMetric.ClassificationAuc;
  return toMetricType(normalizedVal, BuiltinProfileMetric) ?? undefined;
};

export const toBuiltinTraceMetric = (metric: string): BuiltinTraceMetric | undefined => {
  const normalizedVal = metric.valueOf().toLowerCase().replace(/\./g, '_');

  // Convert calculated LLM metrics to their base metrics
  if (normalizedVal === 'flagged_traces') return BuiltinTraceMetric.TotalPolicyIssues;
  return toMetricType(normalizedVal, BuiltinTraceMetric) ?? undefined;
};

export enum FormulaMetric {
  AvgTokens = 'avg_tokens',
  AvgLatencyMillis = 'avg_latency_millis',
}

enum FormulaType {
  Divide = 'divide',
}

const FormulaMetrics = {
  [FormulaMetric.AvgTokens]: {
    formulaType: FormulaType.Divide,
    builtInMetrics: [BuiltinTraceMetric.TotalTokens, BuiltinTraceMetric.CountTraces],
  },
  [FormulaMetric.AvgLatencyMillis]: {
    formulaType: FormulaType.Divide,
    builtInMetrics: [BuiltinTraceMetric.TotalLatencyMillis, BuiltinTraceMetric.CountTraces],
  },
};

export const toFormulaMetric = (metric: string): FormulaMetric | undefined => {
  const normalizedVal = metric.valueOf().toLowerCase().replace(/\./g, '_');
  return toMetricType(normalizedVal, FormulaMetric) ?? undefined;
};

export const toFormula = (metric: FormulaMetric): string => {
  const formula = FormulaMetrics[metric];
  if (!formula) throw new Error(`Unknown formula metric ${metric}`);
  if (formula.formulaType == FormulaType.Divide) {
    const [numerator, denominator] = formula.builtInMetrics;
    return `${numerator}/${denominator}`;
  }
  throw new Error(`Unknown formula type for metric ${metric}`);
};

export const toTraceFormulaBuiltIns = (metric: FormulaMetric): BuiltinTraceMetric[] => {
  const formula = FormulaMetrics[metric];
  return formula ? formula.builtInMetrics : [];
};

export const toBuiltinMonitorMetric = (metric: string): BuiltinMonitorMetric | undefined => {
  const normalizedVal = metric.valueOf().toLowerCase().replace(/\./g, '_');
  return toMetricType(normalizedVal, BuiltinMonitorMetric) ?? undefined;
};

export const metricQueryToTimeSeriesQuery = (
  query: MetricQuery,
  queryId: string,
  segmentTags?: SegmentTag[],
  readPgMonitor?: boolean,
): TimeSeriesUnionQuery | undefined => {
  const { datasetId, feature, metric, ...rest } = query;
  const profileMetric = toBuiltinProfileMetric(metric);
  if (profileMetric) {
    return {
      ...rest,
      queryId,
      resourceId: datasetId,
      columnName: feature ?? undefined,
      segment: segmentTags,
      metric: profileMetric,
      datasource: 'profiles',
    };
  }
  // currently MetricQuery only supports profile metrics so following code should not be needed as long as
  // types are constructed safely
  const traceMetric = toBuiltinTraceMetric(metric);
  if (traceMetric) {
    return {
      ...rest, // can include traceId
      queryId,
      resourceId: datasetId,
      segment: segmentTags,
      metric: traceMetric,
      datasource: 'traces',
    };
  }
  const monitorMetric = toBuiltinMonitorMetric(metric);
  if (monitorMetric) {
    return {
      ...rest, // can include analyzerId and monitorId
      queryId,
      resourceId: datasetId,
      columnName: feature ?? undefined,
      segment: segmentTags,
      metric: monitorMetric,
      readPgMonitor: !!readPgMonitor,
      datasource: 'monitors',
    };
  }
  return undefined;
};
