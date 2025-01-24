import { DataGranularity } from '@whylabs/data-service-node-client';

import { profileToGQL } from '../../../../graphql/contract-converters/data-service/profile-converter';
import {
  FeatureSketch,
  FeatureSketchFilter,
  IndividualProfileItem,
  SegmentTag,
} from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { defaultQuantileFractions } from '../data-service-types';
import { getInterval } from '../data-service-utils';
import { sketchFilterToFeatures } from '../queries/feature-queries';
import { flattenProfiles } from './profile-rollup';

const logger = getLogger('DataServiceProfilesLogger');

export type ListIndividualProfilesRequest = {
  orgId: string;
  datasetId: string;
  fromTimestamp: number;
  toTimestamp: number;
  segmentTags: SegmentTag[];
  offset?: number;
  limit?: number; // max is 10,000
};

export const listIndividualProfiles = async (
  req: ListIndividualProfilesRequest,
  options?: CallOptions,
): Promise<IndividualProfileItem[]> => {
  const { orgId, datasetId, fromTimestamp, toTimestamp, segmentTags, offset, limit } = req;
  logger.info('Fetching individual profiles list for org %s, dataset %s', req.orgId, req.datasetId);
  const request = {
    orgId,
    datasetId,
    interval: getInterval(fromTimestamp, toTimestamp),
    segment: segmentTags,
    offset,
    limit,
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const profiles = await tryCall(() => client.profiles.listTracesBySegment(request, axiosCallConfig(options)), options);
  return profiles.data?.traces.map((p) => ({
    datasetId,
    traceId: p.traceId,
    retrievalToken: p.retrievalToken,
    datasetTimestamp: p.datasetTimestamp,
  }));
};

export type GetIndividualSketchRequest = {
  orgId: string;
  datasetId: string;
  histogramSplitPoints: number[] | null;
  filter: FeatureSketchFilter | null;
  retrievalToken: string;
};

export const getIndividualSketch = async (
  request: GetIndividualSketchRequest,
  options?: CallOptions,
): Promise<FeatureSketch[]> => {
  const { orgId, datasetId, histogramSplitPoints, filter, retrievalToken } = request;
  // we need an interval, pending a new API that uses the whylabs retrievalToken
  const dateNow = Date.now();
  const dateFrom = 1577836800000; // 1 Jan 2020
  const req = {
    orgId,
    datasetId,
    columnNames: sketchFilterToFeatures(filter),
    retrievalToken,
    granularity: DataGranularity.Individual,
    interval: getInterval(dateFrom, dateNow),
    fractions: defaultQuantileFractions,
    splitPoints: histogramSplitPoints ?? undefined,
    // numBins let this default based on split points
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.profiles.profileRollup(req, axiosCallConfig(options)), options);

  // An individual profile might have zero, one or more than one sketches, although the latter case would
  // probably be unintended and due to duplicate upload or failing to change the provided id
  // We're going to replace this logic with using a unique whylabs ID, but for now we'll just take the first one
  if (!data?.length) return [];
  return flattenProfiles([data[0]]).map((profile) =>
    profileToGQL(orgId, datasetId, [], profile, defaultQuantileFractions),
  );
};
