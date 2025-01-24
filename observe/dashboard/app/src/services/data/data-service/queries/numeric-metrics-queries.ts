import {
  BuiltinProfileMetric,
  DataGranularity,
  ProfileTimeSeriesQuery as DataServiceProfileTimeSeriesQuery,
  TimeSeriesQuery as DataServiceTimeSeriesQuery,
  FormulaQuery,
  TimeSeriesQuery,
  TimeSeriesQueryRequest,
} from '@whylabs/data-service-node-client';
import { chunk, sortBy } from 'lodash';

import { DataQueryValidationError } from '../../../../errors/dashbird-error';
import { isSupportedNumericMetric } from '../../../../graphql/contract-converters/data-service/numeric-metrics-converter';
import {
  AnalysisMetric,
  FloatDataPoint,
  MetricQuery,
  SegmentTag,
  TimePeriod,
} from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { BatchableRequest } from '../../data-utils';
import {
  getDataServiceGranularity,
  getInterval,
  getIntervalWithDuration,
  metricQueryToTimeSeriesQuery,
  toBuiltinProfileMetric,
} from '../data-service-utils';

const logger = getLogger('DataServiceNumericMetricsLogger');

export type GetMetricRequest = {
  orgId: string;
  fromTimestamp: number;
  toTimestamp: number | null; // if toTimestamp is null, a single batch is required
  granularity: TimePeriod;
  segmentTags?: SegmentTag[];
  queries: MetricQuery[];
};

export type GetBatchableMetricRequestKey = Omit<GetMetricRequest, 'queries'>;
export type GetBatchableMetricRequestParams = Pick<GetMetricRequest, 'queries'>;
export type GetBatchableMetricRequest = BatchableRequest<GetBatchableMetricRequestKey, GetBatchableMetricRequestParams>;

export type GetMetricRollupRequest = {
  orgId: string;
  interval: string;
  metric: AnalysisMetric;
  datasetId: string;
  column?: string;
  segments: SegmentTag[][];
};

export const getMetricTimeseriesQueries = (
  params: GetMetricRequest,
  readPgMonitor: boolean,
): TimeSeriesQueryRequest[] => {
  const { fromTimestamp, toTimestamp, queries, segmentTags, granularity } = params;
  const interval =
    toTimestamp === null
      ? getIntervalWithDuration(fromTimestamp, granularity)
      : getInterval(fromTimestamp, toTimestamp);
  const timeseriesQueries: DataServiceTimeSeriesQuery[] = [];

  queries.forEach((query, index) => {
    const timeseriesQuery = metricQueryToTimeSeriesQuery(query, `q${index}`, segmentTags, readPgMonitor);
    if (timeseriesQuery) {
      timeseriesQueries.push(timeseriesQuery);
    } else {
      logger.error(`Unsupported metric in timeseries request: ${query.metric}`);
    }
  });
  // sort so queries for the same column are likely to be batched together
  const rollupGranularity = getDataServiceGranularity(granularity);
  const sortedQueries = sortBy(timeseriesQueries, ['resourceId', 'segment', 'columnName']);
  const chunkedQueries = chunk(sortedQueries, 10);
  return chunkedQueries.map((queries) => ({
    interval,
    rollupGranularity,
    timeseries: queries,
  }));
};

export const getNumericMetricsSegmentRollupQueries = (params: GetMetricRollupRequest): TimeSeriesQueryRequest[] => {
  const { interval, segments, metric: analysisMetric, datasetId, column } = params;
  const timeseriesQueries: ProfileTimeSeriesQuery[] = [];
  const metric = toBuiltinProfileMetric(analysisMetric);
  if (metric) {
    segments.forEach((segmentTags, index) => {
      timeseriesQueries.push({
        queryId: `q${index}`,
        metric: metric,
        columnName: column,
        resourceId: datasetId,
        segment: segmentTags,
        datasource: 'profiles',
      });
    });
  } else {
    logger.error(`Unsupported metric: ${analysisMetric}`);
  }
  // sort so queries for the same column are likely to be batched together
  const sortedQueries = sortBy(timeseriesQueries, ['resourceId', 'segment', 'columnName']);
  const chunkedQueries = chunk(sortedQueries, 10);
  return chunkedQueries.map((queries) => ({
    interval,
    rollupGranularity: DataGranularity.All,
    timeseries: queries,
  }));
};

export type TimeSeriesMetric = BuiltinProfileMetric | BuiltinTraceMetric | BuiltinMonitorMetric;

// Had to define the following the types because they're not exposed in dataservice client
export enum BuiltinMonitorMetric {
  MaxThreshold = 'max_threshold',
  MinThreshold = 'min_threshold',
  MinDrift = 'min_drift',
  MaxDrift = 'max_drift',
  AvgDrift = 'avg_drift',
  MinDiff = 'min_diff',
  MaxDiff = 'max_diff',
  AnomalyCount = 'anomaly_count',
}

export enum BuiltinTraceMetric {
  CountTraces = 'count_traces',
  TotalPolicyIssues = 'total_policy_issues',
  TotalBlocked = 'total_blocked',
  TotalTokens = 'total_tokens',
  TotalLatencyMillis = 'total_latency_millis',
}

export type MonitorTimeSeriesQuery = TimeSeriesQuery & {
  analyzerId?: string;
  monitorId?: string;
  readPgMonitor: boolean;
  metric: BuiltinMonitorMetric;
  datasource: 'monitors';
};

export type TraceTimeSeriesQuery = TimeSeriesQuery & {
  traceId?: string;
  metric: BuiltinTraceMetric;
  datasource: 'traces';
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// We only deal with profile metric queries that have a dataset and metric field (i.e. no custom spec)
export type ProfileTimeSeriesQuery = DataServiceProfileTimeSeriesQuery &
  Required<Pick<DataServiceProfileTimeSeriesQuery, 'resourceId' | 'metric'>> & { datasource: 'profiles' };

export type TimeSeriesUnionQuery = ProfileTimeSeriesQuery | MonitorTimeSeriesQuery | TraceTimeSeriesQuery;

export type GetMetricsTimeseriesRequest = {
  orgId: string;
  interval: string;
  granularity: TimePeriod;
  queries: TimeSeriesUnionQuery[];
  formulas?: FormulaQuery[];
};

export type MetricTimeseriesResult = {
  queryId: string;
  datasetId: string;
  column?: string;
  metric?: TimeSeriesMetric; // will not have a metric for formulas
  points: Array<FloatDataPoint>;
  segment?: SegmentTag[];
};

type QueryRequestProps = {
  queries: MetricQuery[];
  fromTimestamp: number;
  toTimestamp: number;
};
export const validateQueryRequest = ({ queries, fromTimestamp, toTimestamp }: QueryRequestProps): void => {
  const errors: string[] = [];
  if (fromTimestamp > toTimestamp || toTimestamp === 0) {
    errors.push(`Time range ${fromTimestamp} to ${toTimestamp} is invalid`);
  }
  const badMetrics = new Set<string>();
  queries.forEach((q) => {
    if (!isSupportedNumericMetric(q.metric)) badMetrics.add(q.metric);
  });
  if (badMetrics.size) errors.push(`Metric(s) ${Array.from(badMetrics).join(', ')} not supported`);
  if (errors.length) {
    logger.warn(`Validation errors: ${errors.join(', ')}`);
    throw new DataQueryValidationError(errors);
  }
};
