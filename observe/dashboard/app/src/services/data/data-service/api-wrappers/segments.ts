import { GetSegmentAnomalyCountsRequest } from '@whylabs/data-service-node-client';
import { equals } from 'ramda';

import { filterSegmentTags } from '../../../../graphql/filters/segment-filters';
import { DashbirdErrorCode, SegmentSortBy, SegmentTag, SortDirection } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { OperationContext, sortAsc } from '../../../../util/misc';
import { segmentTextArrayToTags, segmentTextToTags } from '../../../../util/tags';
import { ServiceError } from '../../../errors/service-errors';
import { dataServiceClient } from '../data-service-client-factory';
import { getInterval } from '../data-service-utils';
import {
  GetPaginatedSegmentKeysRequest,
  GetSegmentsRequest,
  GetSortedSegmentsRequest,
  SegmentSummary,
  SegmentedAnomalyCount,
  getSegmentTagsQuery,
} from '../queries/segment-queries';

const logger = getLogger('DataServiceSegmentsLogger');

export const getSegmentedAnomalyCount = async (
  req: GetSegmentAnomalyCountsRequest,
  options?: CallOptions,
): Promise<SegmentedAnomalyCount[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: req.datasetId }, options);
  const { data } = await tryCall(() => client.analysis.getSegmentAnomalyCounts(req), options);
  const context: OperationContext = { dataType: 'anomaly', orgId: req.orgId, datasetId: req.datasetId };
  // Note we are swallowing anomaly counts for unparsable segments here
  const counts: SegmentedAnomalyCount[] = [];
  data.forEach((result) => {
    try {
      counts.push({ tags: segmentTextToTags(result.segment), count: result.anomalyCount });
    } catch (tagErr) {
      if (tagErr instanceof Error) {
        logger.warn(`Tag error: ${tagErr.message} in org ${context.orgId} dataset ${context.datasetId}`);
      } else {
        logger.error(`Unexpected error ${tagErr} parsing tags in org ${context.orgId} dataset ${context.datasetId}`);
      }
    }
  });
  return counts;
};

const sortTags = (tags: SegmentTag[]): SegmentTag[] => tags.slice().sort((t1, t2) => t1.key.localeCompare(t2.key));

const tagsToText = (tags: SegmentTag[]): string => tags.map((tag) => `${tag.key}=${tag.value}`).join('&');
const compareSegmentSummary = (a: SegmentSummary, b: SegmentSummary): number =>
  tagsToText(sortTags(a.segment.tags)).localeCompare(tagsToText(sortTags(b.segment.tags)));

/**
 * Checks whether the two sets of segment tags are exactly equal.
 * The supplied tags don't have to be sorted.
 * @param tagsA
 * @param tagsB
 */
export const isSegmentExactMatch = (tagsA: SegmentTag[], tagsB: SegmentTag[]): boolean => {
  const tagsASorted = sortTags(tagsA);
  const tagsBSorted = sortTags(tagsB);

  return equals(tagsASorted, tagsBSorted);
};

/**
 * Checks whether the search tags are a subset of the actual tags
 * @param actualTags
 * @param searchTags
 */
export const isSegmentPartialMatch = (actualTags: SegmentTag[], searchTags: SegmentTag[]): boolean =>
  searchTags.every((searchTag) => actualTags.some((actualTag) => equals(searchTag, actualTag)));

/**
 * Given a list of tags mapped to anomaly counts, find the anomaly count for the specified segment
 * @param segment The segment we're interested in
 * @param anomalyCounts List of anomaly counts for each existing segment
 */
const getAnomalyCountForSegment = (segment: SegmentSummary, anomalyCounts: SegmentedAnomalyCount[]): number => {
  const tags = segment.segment.tags;
  const matchingSegment = anomalyCounts.find((anomalyCount) => isSegmentExactMatch(tags, anomalyCount.tags));
  return matchingSegment?.count ?? 0;
};

export const getPaginatedSegmentKeys = async (
  req: GetPaginatedSegmentKeysRequest,
  options?: CallOptions,
): Promise<{ [key: string]: string[] }> => {
  if (!req.datasetId || !req.orgId) {
    throw new ServiceError(
      'Trying to fetch segments without a valid datasetId or orgId',
      DashbirdErrorCode.InvalidRequest,
    );
  }
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: req.datasetId }, options);
  const { data } = await tryCall(async () => {
    return client.profiles.paginatedSegmentTagList(req, axiosCallConfig(options));
  }, options);
  return data.results;
};

export const getSegmentTags = async (req: GetSegmentsRequest, options?: CallOptions): Promise<SegmentSummary[]> => {
  const query = getSegmentTagsQuery(req);
  if (!query.datasetId) {
    throw new ServiceError('Trying to fetch segments without a valid datasetId', DashbirdErrorCode.InvalidRequest);
  }
  const { orgId, datasetId } = req;
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const callOptions: CallOptions = addToContext({ orgId, datasetId, dataType: 'profile' }, options);
  return tryCall(async () => {
    const { data } = await client.profiles.getSegments(query, axiosCallConfig(callOptions));
    return segmentTextArrayToTags(data, callOptions.context.operationContext).map((tags) => ({ segment: { tags } }));
  }, options);
};

export const getSortedSegmentTags = async (
  req: GetSortedSegmentsRequest,
  options?: CallOptions,
): Promise<SegmentSummary[]> => {
  const query = getSegmentTagsQuery(req);
  if (!query.datasetId) {
    throw new ServiceError('Trying to fetch segments without a valid datasetId', DashbirdErrorCode.InvalidRequest);
  }
  const { orgId, datasetId, filter, sort } = req;
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const callOptions: CallOptions = addToContext({ orgId, datasetId, dataType: 'profile' }, options);
  const segmentsList: SegmentSummary[] = await tryCall(async () => {
    const { data } = await client.profiles.getSegments(query, axiosCallConfig(callOptions));
    return segmentTextArrayToTags(data, callOptions.context.operationContext).map((tags) => ({ segment: { tags } }));
  }, options);

  let anomalyCounts: SegmentedAnomalyCount[] = [];
  if (filter.fromTimestamp) {
    // we can only include anomaly counts if there's a timestamp
    const request = {
      orgId: req.orgId,
      datasetId: datasetId,
      // default to current time for the end date for ease of accessing this API, but the starting date must be supplied by the caller
      interval: getInterval(filter.fromTimestamp, filter.toTimestamp ?? Date.now()),
    };
    anomalyCounts = await getSegmentedAnomalyCount(request, options);
  }

  anomalyCounts.forEach((c) => {
    const exactMatch = segmentsList.find((segment) => isSegmentExactMatch(c.tags, segment.segment.tags ?? []));
    if (!exactMatch && !query.filter?.length) {
      segmentsList.push({ segment: { tags: c.tags } });
    }
  });
  // sort in place by name because we need a stable order for pagination where anomaly counts are equal
  segmentsList.sort(compareSegmentSummary);
  switch (sort?.by) {
    case SegmentSortBy.Name:
    case undefined:
      // already sorted by name
      break;
    case SegmentSortBy.AnomalyCount: {
      options = addToContext({ datasetId }, options);
      segmentsList.sort((a, b) =>
        sortAsc(getAnomalyCountForSegment(a, anomalyCounts), getAnomalyCountForSegment(b, anomalyCounts)),
      );
      break;
    }
  }
  switch (sort?.direction) {
    case SortDirection.Desc:
      return segmentsList.reverse();
    case SortDirection.Asc:
    default:
      return segmentsList;
  }
};

export const getSegmentsForKey = async (
  {
    key,
    orgId,
    resourceId,
    tags,
  }: {
    key: string;
    orgId: string;
    resourceId: string;
    tags: SegmentTag[];
  },
  callOptions: CallOptions,
): Promise<string[]> => {
  // May want to add an api in Dataservice to fetch the list of values for a single key, rather than retrieve and filter
  callOptions = addToContext({ datasetId: resourceId }, callOptions);
  const result = await getSegmentTags({ orgId, datasetId: resourceId, filter: {} }, callOptions);

  const searchableTags: SegmentTag[] = [];
  result.forEach((s) => {
    s.segment?.tags?.forEach((tag) => {
      if (tag.key === key) {
        searchableTags.push(tag);
      }
    });
  });

  return filterSegmentTags(searchableTags, tags ?? [], 'value');
};
