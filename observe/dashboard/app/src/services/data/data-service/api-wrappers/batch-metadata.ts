import { sortBy, uniq } from 'lodash';

import { BatchMetadata, DateRange, SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { BatchableRequest } from '../../data-utils';
import {
  convertToBatchMetadata,
  convertToGQLBatchMetadata,
  convertToSegmentedBatchMetadata,
} from '../../datasources/helpers/batch-metadata';
import { isSegmentExactMatch } from '../../songbird/loaders/segments';
import { dataServiceClient } from '../data-service-client-factory';
import {
  getBatchDateRangeQuery,
  getBatchMetadataByTimeRangeQuery,
  getBatchTimestampsByTimeRangeQuery,
  getSegmentedMaxioQuery,
} from '../queries/metadata-queries';

interface BatchGetDateRangeRequest {
  orgId: string;
  datasetId: string;
  timePeriod: TimePeriod;
  fromTime: number;
  toTime: number;
}

export type GetSegmentedMetadataRequest = BatchableRequest<
  GetSegmentedMetadataRequestKey,
  GetSegmentedMetadataRequestParams
>;

export type GetSegmentedMetadataRequestKey = {
  orgId: string;
  timePeriod: TimePeriod;
  datasetId: string;
  fromTime: number;
  toTime: number;
  includeInputOutputCounts: boolean;
};

export type GetSegmentedMetadataRequestParams = {
  segmentTags: SegmentTag[];
  outputFeatureNames: string[];
};

type BatchGetMetadataRequest = GetSegmentedMetadataRequestKey & GetSegmentedMetadataRequestParams;

const getBatchTimestamps = async (req: BatchGetMetadataRequest, options?: CallOptions): Promise<BatchMetadata[]> => {
  const emptyMetadata = { inputCount: 0, outputCount: 0 }; // These fields aren't going to be returned anyway
  const { orgId, segmentTags, fromTime, toTime, datasetId, timePeriod } = req;
  const rqst = getBatchTimestampsByTimeRangeQuery(timePeriod, orgId, datasetId, segmentTags ?? [], fromTime, toTime);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId }, options);
  const { data } = await tryCall(() => client.profiles.getBatchDateRangeQuery(rqst, axiosCallConfig(options)), options);
  return sortBy(
    data.map((res) => convertToGQLBatchMetadata(emptyMetadata, datasetId, segmentTags ?? [], res.ts, req.timePeriod)),
    ['timestamp'],
  );
};

export const fetchSegmentedMetadataForTimeRange = async (
  requestKey: GetSegmentedMetadataRequestKey,
  params: GetSegmentedMetadataRequestParams[],
  options?: CallOptions,
): Promise<BatchMetadata[]> => {
  const { orgId, datasetId, timePeriod, fromTime, toTime, includeInputOutputCounts } = requestKey;
  const segments = params.map((p) => p.segmentTags);
  const outputFeatureNames = uniq(params.map((p) => p.outputFeatureNames).flat());
  const rqst = getSegmentedMaxioQuery(
    timePeriod,
    orgId,
    datasetId,
    segments,
    fromTime,
    toTime,
    includeInputOutputCounts,
    outputFeatureNames,
  );
  options = addToContext({ datasetId }, options);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.profiles.maxIOSegmented(rqst), options);
  return convertToSegmentedBatchMetadata(data, segments, datasetId, timePeriod);
};

export const filterSegmentedMetadataForTimeRange = (
  param: GetSegmentedMetadataRequestParams,
  res: BatchMetadata[] | null,
): BatchMetadata[] => {
  return res?.filter((r) => isSegmentExactMatch(r.tags, param.segmentTags)) ?? [];
};

export const getBatchMetadataForTimeRange = async (
  req: BatchGetMetadataRequest,
  options?: CallOptions,
): Promise<BatchMetadata[]> => {
  const { orgId, segmentTags, fromTime, toTime, datasetId, outputFeatureNames, timePeriod, includeInputOutputCounts } =
    req;
  if (!includeInputOutputCounts) {
    return getBatchTimestamps(req, options);
  }
  const rqst = getBatchMetadataByTimeRangeQuery(
    timePeriod,
    orgId,
    datasetId,
    segmentTags ?? [],
    fromTime,
    toTime,
    includeInputOutputCounts,
    outputFeatureNames,
  );
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId }, options);
  const { data } = await tryCall(() => client.profiles.maxIO(rqst, axiosCallConfig(options)), options);
  return convertToBatchMetadata(data, segmentTags ?? [], datasetId, timePeriod);
};

export const getBatchDateRange = async (
  params: BatchGetDateRangeRequest,
  options?: CallOptions,
): Promise<DateRange> => {
  const { timePeriod, fromTime } = params;

  const query = getBatchDateRangeQuery(timePeriod, fromTime);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: params.datasetId }, options);
  const { data } = await tryCall(
    () => client.analysis.getTargetBucketBoundary(query, axiosCallConfig(options)),
    options,
  );

  return { fromTimestamp: data.start, toTimestamp: data.end };
};
