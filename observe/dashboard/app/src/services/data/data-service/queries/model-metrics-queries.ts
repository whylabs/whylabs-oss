import { ModelMetricsRqst } from '@whylabs/data-service-node-client';

import { SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { BatchableRequest } from '../../data-utils';
import { DerivedMetric } from '../data-service-types';
import { getDataServiceGranularity, getInterval, getIntervalWithDuration } from '../data-service-utils';

export interface GetModelMetricsRequest {
  orgId: string;
  datasetId: string;
  segmentTags: SegmentTag[];
  timestamp: number;
  granularity: TimePeriod;
}

export type GetDerivedMetricsRequestKey = {
  orgId: string;
  datasetId: string;
  segmentTags: SegmentTag[];
  granularity: TimePeriod;
  fromTimestamp: number;
  toTimestamp: number | null;
};

export type GetDerivedMetricsRequestParams = {
  metricName: DerivedMetric;
};

export type GetDerivedMetricsRequest = BatchableRequest<GetDerivedMetricsRequestKey, GetDerivedMetricsRequestParams>;

export type GetModelMetricsTimeRangeRequest = {
  orgId: string;
  datasetId: string;
  segmentTags: SegmentTag[];
  granularity: TimePeriod;
  fromTimestamp: number;
  toTimestamp: number;
};

export const getDerivedMetricsQuery = (key: GetDerivedMetricsRequestKey): ModelMetricsRqst => {
  const { orgId, datasetId, segmentTags, granularity, fromTimestamp, toTimestamp } = key;
  const segment = segmentTags?.length ? segmentTags : undefined;
  const interval = toTimestamp
    ? getInterval(fromTimestamp, toTimestamp)
    : getIntervalWithDuration(fromTimestamp, granularity);
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(granularity),
    datasetId: datasetId,
    interval,
    segment,
  };
};

export const getModelMetricsQuery = (req: GetModelMetricsRequest): ModelMetricsRqst => {
  const { orgId, datasetId, segmentTags, timestamp, granularity } = req;
  const segment = segmentTags?.length ? segmentTags : undefined;
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(granularity),
    datasetId: datasetId,
    interval: getIntervalWithDuration(timestamp, granularity),
    segment,
  };
};

export const getModelMetricsTimeRangeQuery = (req: GetModelMetricsTimeRangeRequest): ModelMetricsRqst => {
  const { orgId, datasetId, segmentTags, granularity, fromTimestamp, toTimestamp } = req;
  const segment = segmentTags?.length ? segmentTags : undefined;
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(granularity),
    datasetId: datasetId,
    interval: getInterval(fromTimestamp, toTimestamp),
    segment,
  };
};
