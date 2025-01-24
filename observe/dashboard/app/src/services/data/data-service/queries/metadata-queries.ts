import {
  BucketCalculationRequest,
  MaxIORequest,
  MaxIoSegmentedRequest,
  SortOrder,
  TimeSeriesProfileRequest,
} from '@whylabs/data-service-node-client';

import { SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { getDataServiceGranularity, getInterval } from '../data-service-utils';

export const getSegmentedMaxioQuery = (
  timePeriod: TimePeriod,
  orgId: string,
  datasetId: string,
  segments: SegmentTag[][],
  from: number,
  to: number,
  includeInputOutputCounts: boolean,
  outputFeatureNames: string[],
): MaxIoSegmentedRequest => {
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(timePeriod),
    datasetId: datasetId,
    interval: getInterval(from, to),
    segments,
    outputColumns: includeInputOutputCounts ? outputFeatureNames : [],
    order: SortOrder.Asc,
  };
};

export const getBatchMetadataByTimeRangeQuery = (
  timePeriod: TimePeriod,
  orgId: string,
  datasetId: string,
  segmentTags: SegmentTag[],
  from: number,
  to: number,
  includeInputOutputCounts: boolean,
  outputFeatureNames: string[],
): MaxIORequest => {
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(timePeriod),
    datasetId: datasetId,
    interval: getInterval(from, to),
    segment: segmentTags.length ? segmentTags : undefined,
    outputColumns: includeInputOutputCounts ? outputFeatureNames : [],
    order: SortOrder.Asc,
  };
};

export const getBatchTimestampsByTimeRangeQuery = (
  timePeriod: TimePeriod,
  orgId: string,
  datasetId: string,
  segmentTags: SegmentTag[],
  from: number,
  to: number,
): TimeSeriesProfileRequest => {
  return {
    orgId: orgId,
    granularity: getDataServiceGranularity(timePeriod),
    datasetIds: [datasetId],
    interval: getInterval(from, to),
    segment: segmentTags.length ? segmentTags : undefined,
  };
};

export const getBatchDateRangeQuery = (timePeriod: TimePeriod, from: number): BucketCalculationRequest => {
  return {
    granularity: getDataServiceGranularity(timePeriod),
    ts: from,
  };
};
