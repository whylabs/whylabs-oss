import { GetSingleProfileInsights, InsightEntry, ModelRollup } from '@whylabs/data-service-node-client';
import { AxiosResponse } from 'axios';
import { uniq } from 'ramda';

import {
  DataServiceProfile,
  profileToGQL,
} from '../../../../graphql/contract-converters/data-service/profile-converter';
import { FeatureSketch } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { defaultQuantileFractions } from '../data-service-types';
import { getDataServiceGranularity, getInterval, getIntervalWithDuration } from '../data-service-utils';
import {
  GetFeatureSketchRequest,
  GetFeatureSketchesRequestBatchableParams,
  GetFeatureSketchesRequestKey,
  GetReferenceSketchesRequest,
  sketchFilterToFeatures,
} from '../queries/feature-queries';

const logger = getLogger('DataServiceProfilesLogger');
const MAX_COL_NAMES_ROLLUP = 100; // this needs to align with data service

export const getProfilesByTimeRange = async (
  key: GetFeatureSketchesRequestKey,
  reqs: GetFeatureSketchesRequestBatchableParams[],
  options?: CallOptions,
): Promise<FeatureSketch[]> => {
  const { orgId, segmentTags, fromTime, toTime, datasetId, timePeriod, histogramSplitPoints, quantileFractions } = key;

  const featureNames = uniq(reqs.map((r) => r.featureName));
  if (featureNames.length === 0) {
    logger.warn(
      `getProfilesByTimeRange unexpectedly called with no column names for ${orgId} ${key.datasetId}; returning empty results`,
    );
  }
  const allRequestedMetrics = uniq(reqs.flatMap((r) => r.metrics));
  const interval = toTime ? getInterval(fromTime, toTime) : getIntervalWithDuration(fromTime, timePeriod);
  const req = {
    orgId,
    datasetId,
    columnNames: featureNames,
    interval,
    segment: segmentTags,
    granularity: getDataServiceGranularity(timePeriod),
    fractions: quantileFractions,
    splitPoints: histogramSplitPoints,
    metrics: allRequestedMetrics,
    // numBins let this default based on split points
  };
  options = addToContext({ datasetId }, options);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.profiles.profileRollup(req, axiosCallConfig(options)), options);

  return flattenProfiles(data).map((profile) =>
    profileToGQL(orgId, datasetId, segmentTags, profile, quantileFractions),
  );
};

type GetProfilesByTimestampRequest = GetFeatureSketchRequest & { orgId: string };

export const getProfilesByTimestamp = async (
  req: GetProfilesByTimestampRequest,
  options?: CallOptions,
): Promise<FeatureSketch[]> => {
  const { orgId, datasetId, datasetTimestamp, timePeriod, segmentTags, histogramSplitPoints, filter } = req;
  if (!filter?.featureNames) {
    throw Error(`No feature names specified in call to getProfilesByTimestamp for ${orgId} ${req.datasetId}`);
  }
  if (filter?.featureNames.length > MAX_COL_NAMES_ROLLUP) {
    logger.warn(
      `getProfilesByTimestamp called with ${filter?.featureNames.length} columns; truncating to {${MAX_COL_NAMES_ROLLUP}`,
    );
  }
  const columnNames: string[] = filter?.featureNames.slice(0, MAX_COL_NAMES_ROLLUP);
  if (columnNames.length === 0) {
    // do not call profile rollup with an empty array as it will return all columns!
    // this can happen if there are no active columns for this profile
    logger.info(
      'getProfilesByTimestamp called with featureNames filter defined but empty; skipping profile rollup call',
    );
    return [];
  }

  const params = {
    orgId,
    datasetId,
    columnNames,
    interval: getIntervalWithDuration(datasetTimestamp, timePeriod),
    segment: segmentTags,
    granularity: getDataServiceGranularity(timePeriod),
    splitPoints: histogramSplitPoints ?? undefined,
  };
  options = addToContext({ datasetId }, options);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.profiles.profileRollup(params, axiosCallConfig(options)), options);

  const results = flattenProfiles(data).map((profile) => profileToGQL(orgId, datasetId, segmentTags, profile));
  // This query can overfetch for monthly models, so filter to make sure we only have those matching
  // the requested timestamp
  return results.filter((r) => r.createdAt === datasetTimestamp);
};

export const singleProfileInsight = async (
  request: GetSingleProfileInsights,
  options?: CallOptions,
): Promise<AxiosResponse<InsightEntry[]>> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  return tryCall(() => client.profiles.singleProfileInsight(request, axiosCallConfig(options)), options);
};

export const filterProfilesByTimeRange = (
  params: GetFeatureSketchesRequestBatchableParams,
  results: FeatureSketch[] | null,
): FeatureSketch[] => (results ?? []).filter((f) => f.featureName === params.featureName);

export const getReferenceSketches = async (
  request: GetReferenceSketchesRequest,
  options?: CallOptions,
): Promise<FeatureSketch[]> => {
  const { key, params } = request;
  const { orgId, datasetId, histogramSplitPoints, filter, segmentTags } = key;
  const { referenceProfileId } = params;

  const req = {
    orgId,
    datasetId,
    columnNames: sketchFilterToFeatures(filter),
    referenceProfileId,
    fractions: defaultQuantileFractions,
    splitPoints: histogramSplitPoints ?? undefined,
    // numBins let this default based on split points
    segment: segmentTags,
  };
  options = addToContext({ datasetId }, options);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(
    () => client.profiles.getReferenceProfileSketches(req, axiosCallConfig(options)),
    options,
  );

  return flattenProfiles(data).map((profile) =>
    profileToGQL(orgId, datasetId, segmentTags, profile, defaultQuantileFractions),
  );
};

/**
 * Flatten the response from data service
 * By default it includes information about all features for each timestamp,
 * but we need to be able to filter out specific features for presenting in the UI
 * * @param data
 */
export const flattenProfiles = (data: ModelRollup[]): DataServiceProfile[] => {
  return data.flatMap((datasetRollup) =>
    Object.keys(datasetRollup.features).map(
      (columnName) =>
        <DataServiceProfile>{
          timestamp: datasetRollup.timestamp,
          columnName,
          rollup: datasetRollup.features[columnName],
        },
    ),
  );
};
