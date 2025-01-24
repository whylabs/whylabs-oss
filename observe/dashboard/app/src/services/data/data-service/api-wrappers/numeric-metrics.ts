import {
  FormulaQuery,
  NumericMetricByProfile,
  NumericMetricByProfileResponse,
  NumericMetricByReference,
  TimeSeriesQueryResponse,
  TimeSeriesResult,
} from '@whylabs/data-service-node-client';
import { AxiosResponse } from 'axios';
import { chunk, compact, sortBy } from 'lodash';

import {
  DatasetMetricFeature,
  sanitizeTimeSeriesEntries,
  timeseriesMetricsForSegmentToGql,
  timeseriesMetricsToGql,
} from '../../../../graphql/contract-converters/data-service/numeric-metrics-converter';
import { MetricResult, MetricRollupResult, TimePeriod } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, chunkedTryCall, formatContext, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { getDataServiceGranularity } from '../data-service-utils';
import { readPostgresMonitor } from '../queries/analysis-queries';
import {
  GetBatchableMetricRequestKey,
  GetBatchableMetricRequestParams,
  GetMetricRequest,
  GetMetricRollupRequest,
  GetMetricsTimeseriesRequest,
  MetricTimeseriesResult,
  TimeSeriesUnionQuery,
  getMetricTimeseriesQueries,
  getNumericMetricsSegmentRollupQueries,
} from '../queries/numeric-metrics-queries';

const logger = getLogger('DataServiceNumericMetricsLogger');

export const getNumericMetrics = async (params: GetMetricRequest, options?: CallOptions): Promise<MetricResult[]> => {
  if (params.queries.length == 0) {
    return [];
  }
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const readPgMonitor = await readPostgresMonitor(params.orgId, options);
  const timeseriesQueries = getMetricTimeseriesQueries(params, readPgMonitor);

  const timeseriesResponses = await Promise.allSettled(
    timeseriesQueries.map((query) =>
      tryCall(() => client.metrics.timeseries(params.orgId, query, axiosCallConfig(options)), options),
    ),
  );
  // we need to override the fixed timestamp from data service if granularity is all
  const overrideStamp = params.granularity === TimePeriod.All ? params.fromTimestamp : null;
  return timeseriesMetricsToGql(
    params.queries,
    timeseriesResponses.flatMap((r) => {
      if (r.status === 'rejected') return [];
      return compact(r.value.data.timeseries);
    }),
    params.segmentTags,
    overrideStamp,
  );
};

export const getBatchableNumericMetrics = async (
  key: GetBatchableMetricRequestKey,
  params: GetBatchableMetricRequestParams[],
  options?: CallOptions,
): Promise<MetricResult[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const queries = params.flatMap((param) => param.queries);
  const readPgMonitor = await readPostgresMonitor(key.orgId, options);
  const timeseriesQueries = getMetricTimeseriesQueries({ ...key, queries }, readPgMonitor);

  const tsCalls = timeseriesQueries.map(
    (query) => () => client.metrics.timeseries(key.orgId, query, axiosCallConfig(options)),
  );
  // Note each chunked query contains up to 10 queries, increase chunkSize at risk of crashing server
  const chunkedResults = await chunkedTryCall<AxiosResponse<TimeSeriesQueryResponse>>(tsCalls, 10, options);
  const flattenedResults = chunkedResults.flatMap((resp) => compact(resp.data.timeseries));
  return timeseriesMetricsToGql(queries, flattenedResults);
};

export const filterBatchableNumericMetrics = (
  params: GetBatchableMetricRequestParams,
  results: MetricResult[] | null,
): MetricResult[] => {
  const filtered = [];
  for (const query of params.queries) {
    const result = results?.find(
      (r) =>
        r.datasetId === query.datasetId &&
        r.metric === query.metric &&
        r.feature === (query.feature ?? DatasetMetricFeature),
    );
    if (result) {
      filtered.push(result);
    }
  }
  return filtered;
};

export const getNumericMetricsSegmentRollup = async (
  params: GetMetricRollupRequest,
  options?: CallOptions,
): Promise<MetricRollupResult[]> => {
  const queries = getNumericMetricsSegmentRollupQueries(params);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const tsCalls = queries.map(
    (query) => () => client.metrics.timeseries(params.orgId, query, axiosCallConfig(options)),
  );
  // Note each chunked query contains up to 10 queries, increase chunkSize at risk of crashing server
  const chunkedResults = await chunkedTryCall<AxiosResponse<TimeSeriesQueryResponse>>(tsCalls, 10, options);
  const flattenedResults = chunkedResults.flatMap((resp) => compact(resp.data.timeseries));
  return timeseriesMetricsForSegmentToGql(params, flattenedResults);
};

export interface GetNumericMetricByProfileRequest extends NumericMetricByProfile {
  limit?: number | null;
}
export interface GetNumericMetricByProfileResponse {
  isTruncated: boolean;
  list: NumericMetricByProfileResponse[];
}

export const getNumericMetricByProfile = async (
  params: GetNumericMetricByProfileRequest,
  options?: CallOptions,
): Promise<GetNumericMetricByProfileResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(
    () => client.profiles.getNumericMetricByProfile(params, axiosCallConfig(options)),
    options,
  );
  const list = result.data ?? [];

  const truncatedLimit = params.limit ?? 0;
  const isTruncated = params.limit ? list.length > truncatedLimit : false;
  return {
    isTruncated,
    list: isTruncated ? list.slice(0, truncatedLimit) : list,
  };
};

export const downloadNumericMetricByProfile = async (
  params: GetNumericMetricByProfileRequest,
  options?: CallOptions,
): Promise<string | undefined> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(
    () => client.profiles.downloadNumericMetricByProfile(params, axiosCallConfig(options)),
    options,
  );
  return result.data;
};

export const getNumericMetricByReference = async (
  params: NumericMetricByReference,
  options?: CallOptions,
): Promise<NumericMetricByProfileResponse | null> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(
    () => client.profiles.getNumericMetricByReference(params, axiosCallConfig(options)),
    options,
  );
  if (!result.data.length) return null;
  if (result.data.length > 1) {
    logger.error(
      `Unexpectedly received more than one getNumericMetricByReference result for ${formatContext(options?.context)}`,
    );
  }
  return result.data[0];
};

const isFormulaQuery = (query: TimeSeriesUnionQuery | FormulaQuery): query is FormulaQuery => {
  return 'formula' in query && query.formula !== undefined;
};

const toMetricTimeseriesResult = (
  query: TimeSeriesUnionQuery | FormulaQuery,
  results: TimeSeriesResult[],
): MetricTimeseriesResult => {
  // return the result corresponding to the query
  const maybeResult = results.find((r) => r.id === query.queryId);
  const pointsWithData = maybeResult?.data?.filter((d) => d.value !== undefined) ?? [];
  const result: MetricTimeseriesResult = {
    queryId: query.queryId,
    datasetId: query.resourceId ?? 'undefined',
    points: sanitizeTimeSeriesEntries(pointsWithData),
    segment: query.segment,
    column: query.columnName,
  };
  if (!isFormulaQuery(query)) {
    result.metric = query.metric;
  }
  return result;
};

export const getMetricsTimeseries = async (
  params: GetMetricsTimeseriesRequest,
  options?: CallOptions,
): Promise<MetricTimeseriesResult[]> => {
  if (params.queries.length == 0) {
    return [];
  }
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const readPgMonitor = await readPostgresMonitor(params.orgId, options);
  const timeseriesQueries = params.queries.map((q) => ({ ...q, readPgMonitor }));
  const sortedQueries = sortBy(timeseriesQueries, ['resourceId', 'segment', 'columnName']);
  const chunkedQueries = chunk(sortedQueries, 10);
  const tsCalls = chunkedQueries.map(
    (queries) => () =>
      client.metrics.timeseries(
        params.orgId,
        {
          interval: params.interval,
          rollupGranularity: getDataServiceGranularity(params.granularity),
          timeseries: queries,
          formulas: params.formulas,
        },
        axiosCallConfig(options),
      ),
  );
  // launching up to 10 requests with 10 queries at once! May need to dial this down.
  const chunkedResults = await chunkedTryCall<AxiosResponse<TimeSeriesQueryResponse>>(tsCalls, 10, options);
  const flattenedResults = chunkedResults.flatMap((resp) => compact(resp.data.timeseries));

  const results: MetricTimeseriesResult[] = [];
  params.queries.forEach((q) => {
    results.push(toMetricTimeseriesResult(q, flattenedResults));
  });
  params.formulas?.forEach((q) => {
    results.push(toMetricTimeseriesResult(q, flattenedResults));
  });
  return results;
};
