import {
  TraceDataRangeEntry,
  TraceDataRangeRequest,
  TraceDataRangeResponse,
  TraceDetailRequest,
  TraceDetailResponse,
  TraceListRequest,
  TraceListResponse,
  TraceQueryRequest,
  TraceQueryResponse,
  TraceSummaryRequest,
  TraceSummaryResponse,
} from '@whylabs/data-service-node-client';

import { getLogger } from '../../../../providers/logger';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { isNumber } from '../../../../util/type-guards';
import { BatchableRequest } from '../../data-utils';
import { dataServiceClient } from '../data-service-client-factory';

const logger = getLogger('DataServiceTracesLogger');

export const getTraceDetail = async (
  props: TraceDetailRequest,
  options?: CallOptions,
): Promise<TraceDetailResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  return (await tryCall(() => client.traces.detail(props, axiosCallConfig(options)), options)).data;
};

export const queryTraces = async (props: TraceQueryRequest, options?: CallOptions): Promise<TraceQueryResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  return (await tryCall(() => client.traces.query(props, axiosCallConfig(options)), options)).data;
};

export const listTraces = async (props: TraceListRequest, options?: CallOptions): Promise<TraceListResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  const response = await tryCall(() => client.traces.traceList(props, axiosCallConfig(options)), options);
  return response.data;
};

export const getTracesDataRange = async (
  props: TraceDataRangeRequest,
  options?: CallOptions,
): Promise<TraceDataRangeResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  const response = await tryCall(() => client.traces.traceDataRange(props, axiosCallConfig(options)), options);
  return response.data;
};

type AllTraceResourcesRequest = {
  orgId: string;
};

type TraceDataRangeParams = {
  orgId: string;
  resourceId: string;
};

export type GetBatchableTraceResourcesRequest = BatchableRequest<AllTraceResourcesRequest, TraceDataRangeParams>;

export const listResourcesWithTraces = async (
  props: AllTraceResourcesRequest,
  options?: CallOptions,
): Promise<TraceDataRangeEntry[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(
    () => client.traces.listTraceResources(props.orgId, axiosCallConfig(options)),
    options,
  );
  return response.data.entries;
};

export const batchableGetTracesDateRange = async (
  key: AllTraceResourcesRequest,
  params: TraceDataRangeParams[],
  options?: CallOptions,
): Promise<TraceDataRangeEntry[]> => {
  return listResourcesWithTraces(key, options);
};

export const filterResourcesWithTraces = (
  params: TraceDataRangeParams,
  results: TraceDataRangeEntry[] | null,
): TraceDataRangeResponse => {
  const result = results?.find((r) => r.resourceId === params.resourceId);
  return {
    orgId: params.orgId ?? '',
    resourceId: params.resourceId,
    hasTraceData: !!result,
    minStartTime: result?.minStartTime ?? 0,
    maxStartTime: result?.maxStartTime ?? 0,
  };
};

export const getTracesSummary = async (
  props: TraceSummaryRequest,
  options?: CallOptions,
): Promise<TraceSummaryResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  return (await tryCall(() => client.traces.summary(props, axiosCallConfig(options)), options)).data;
};

export const getTracesTagSummary = async (
  props: TraceSummaryRequest,
  options?: CallOptions,
): Promise<TraceSummaryResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: props.resourceId }, options);
  return (await tryCall(() => client.traces.tagSummary(props, axiosCallConfig(options)), options)).data;
};

interface TraceEntryCounts {
  violationsCount: number;
  blockedInteractionsCount: number;
  total: number;
}
export const parseTraceEntryCounts = (entry: string, formattedContext: string): TraceEntryCounts | null => {
  try {
    // OpenAPI client says that response it's a string, but in fact it is an Object
    const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
    const issues: TraceEntryCounts = { violationsCount: 0, blockedInteractionsCount: 0, total: 0 };
    if ('totalWithPolicyIssues' in parsed && isNumber(parsed.totalWithPolicyIssues)) {
      issues.violationsCount = parsed.totalWithPolicyIssues;
    }
    if ('totalBlocked' in parsed && isNumber(parsed.totalBlocked)) {
      issues.blockedInteractionsCount = parsed.totalBlocked;
    }
    if ('total' in parsed && isNumber(parsed.totalBlocked)) {
      issues.total = parsed.total;
    }
    return issues;
  } catch (error) {
    logger.error({ traceString: entry, error }, `parseTraceEntryCounts error ${formattedContext}`);
    return null;
  }
};
