import {
  GetAlertsOverTimeRequest,
  GetAlertsOverTimeResponse,
  GetAnomalyCountsRequest,
  SortOrder,
} from '@whylabs/data-service-node-client';
import { sortBy, uniq } from 'lodash';

import {
  AlertCategoryCounts,
  AnomalyCount,
  AnomalyCountGroupBy,
  SegmentTag,
  TimePeriod,
} from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { ifNotEmpty, notNullish } from '../../../../util/misc';
import { BatchableRequest, paramSetsToArrays } from '../../data-utils';
import {
  AlertCountsByFeatureAndDataset,
  AnomalyCountsBySegment,
  countsByCategoryByFeature,
  countsByCategoryBySegment,
  countsByMetricByFeature,
  dataServiceAnomalyCountsToGQL,
  dataServiceSegmentedAnomalyCountsToGQL,
} from '../../datasources/helpers/anomaly-counts';
import { dataServiceClient } from '../data-service-client-factory';
import {
  getDataServiceGranularity,
  getInterval,
  tagsToDataServiceSegment,
  truncateDatasetIds,
} from '../data-service-utils';
import {
  AlertCountRequestKey,
  AlertCountRequestParams,
  GetAnomalyCountRequest,
  defaultAlertCategoryCounts,
  readPostgresMonitor,
} from '../queries/analysis-queries';

const logger = getLogger('DataServiceAnomalyCountsLogger');

export type AnomalyCountBySegmentRequest = BatchableRequest<
  AnomalyCountBySegmentRequestKey,
  AnomalyCountBySegmentRequestParams
>;

export type AnomalyCountBySegmentRequestKey = {
  orgId: string;
  fromTimestamp: number;
  toTimestamp: number;
  timePeriod: TimePeriod;
  groupBy: AnomalyCountGroupBy;
};

export type AnomalyCountBySegmentRequestParams = {
  datasetId: string;
  segmentTags: SegmentTag[];
  monitorIDs?: Set<string>;
  analyzerIDs?: Set<string>;
  runIds?: Set<string>;
};

export const fetchAnomalyCountsBySegment = async (
  requestKey: AnomalyCountBySegmentRequestKey,
  params: AnomalyCountBySegmentRequestParams[],
  options?: CallOptions,
): Promise<AnomalyCountsBySegment> => {
  const { runIds, analyzerIDs, monitorIDs } = paramSetsToArrays(params, ['runIds', 'analyzerIDs', 'monitorIDs']);
  const datasetIds = truncateDatasetIds(uniq(params.map((p) => p.datasetId)), 100, options?.context);
  const segments = uniq(params.map((p) => tagsToDataServiceSegment(p.segmentTags)));
  const { orgId, timePeriod, groupBy, fromTimestamp, toTimestamp } = requestKey;

  const req = {
    orgId,
    datasetIds,
    granularity: getDataServiceGranularity(timePeriod),
    segments: segments,
    runIds: ifNotEmpty(runIds),
    adhoc: !!ifNotEmpty(runIds),
    analyzerIds: ifNotEmpty(analyzerIDs),
    monitorIds: ifNotEmpty(monitorIDs),
    interval: getInterval(fromTimestamp, toTimestamp),
    order: SortOrder.Asc,
    readPgMonitor: await readPostgresMonitor(orgId, options),
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(
    () => client.analysis.getAlertCountsOverTimeSegmented(req, axiosCallConfig(options)),
    options,
  );

  // split out anomalies by feature name
  const cleanedResults = dataServiceSegmentedAnomalyCountsToGQL(data.results, {
    dataType: 'anomalyCount',
    orgId,
  });

  const field = groupBy === AnomalyCountGroupBy.Metric ? 'metric' : 'category';
  return countsByCategoryBySegment(Object.keys(data.results), cleanedResults, field);
};

export const filterAnomalyCountsBySegment = (
  param: AnomalyCountBySegmentRequestParams,
  res: AnomalyCountsBySegment | null,
): AlertCategoryCounts => {
  const { segmentTags } = param;
  return res?.get(tagsToDataServiceSegment(segmentTags)) ?? defaultAlertCategoryCounts;
};

export const fetchCategoricalAlertCountsV3 = async (
  requestKey: AlertCountRequestKey,
  params: AlertCountRequestParams[],
  options?: CallOptions,
): Promise<AlertCountsByFeatureAndDataset> => {
  const { runIds, analyzerIDs, monitorIDs } = paramSetsToArrays(params, ['runIds', 'analyzerIDs', 'monitorIDs']);
  const featureNames = uniq(params.map((p) => p.featureName));
  const { orgId, timePeriod, groupBy, segmentTags, fromTimestamp, toTimestamp, granularityInclusion } = requestKey;
  const applyFeatureFilter = featureNames.length > 0 && featureNames.every(notNullish);
  const datasetIds = truncateDatasetIds(uniq(params.map((p) => p.datasetId)), 100, options?.context);
  const readPgMonitor = await readPostgresMonitor(orgId, options);

  const createReq = (columnNames: string[] | undefined = undefined): GetAlertsOverTimeRequest => ({
    orgId,
    datasetIds,
    granularity: getDataServiceGranularity(timePeriod),
    segments: segmentTags ? [tagsToDataServiceSegment(segmentTags)] : undefined,
    runIds: ifNotEmpty(runIds),
    adhoc: !!ifNotEmpty(runIds),
    analyzerIds: ifNotEmpty(analyzerIDs),
    monitorIds: ifNotEmpty(monitorIDs),
    columnNames,
    interval: getInterval(fromTimestamp, toTimestamp),
    order: SortOrder.Asc,
    granularityInclusion,
    readPgMonitor,
  });
  // batch into calls of no more than 100 features
  // this is needed to handle counts for output features on summary page
  const requests = [];
  if (applyFeatureFilter) {
    const maxNames = 100;
    if (featureNames.length > maxNames) {
      logger.info(
        `Received ${
          featureNames.length
        } than 100 column names in call to fetchCategoricalAlertCountsV3 for org ${orgId} and datasets ${datasetIds?.join(
          ', ',
        )} so batching requests`,
      );
    }
    for (let i = 0; i < featureNames.length; i += maxNames) {
      requests.push(createReq(featureNames.slice(i, i + maxNames)));
    }
  } else {
    requests.push(createReq());
  }

  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const responses = await Promise.all(
    requests.map(
      (req) => tryCall(() => client.analysis.getAlertCountsOverTime(req, axiosCallConfig(options))),
      options,
    ),
  );
  const data: GetAlertsOverTimeResponse[] = responses.flatMap((r) => r.data);

  // split out anomalies by feature name
  const cleanedResults = dataServiceAnomalyCountsToGQL(data, {
    dataType: 'anomalyCount',
    orgId,
  });

  const requestedDatasets = new Set(params.map((p) => p.datasetId));
  // Set { null } indicates return all features
  const requestedFeatures = new Set(params.map((p) => p.featureName ?? null));

  switch (groupBy) {
    case AnomalyCountGroupBy.Metric:
      return countsByMetricByFeature(requestedDatasets, requestedFeatures, cleanedResults);
    case AnomalyCountGroupBy.Category:
    case undefined:
      // the default grouping
      return countsByCategoryByFeature(requestedDatasets, requestedFeatures, cleanedResults);
    default:
      throw Error(`Unknown groupBy: ${groupBy}`);
  }
};

export const filterCategoricalAlertCountsV3 = (
  param: AlertCountRequestParams,
  res: AlertCountsByFeatureAndDataset | null,
): AlertCategoryCounts => {
  const { featureName, datasetId } = param;

  const datasetAlertCounts = res?.get(datasetId);

  if (!datasetAlertCounts) {
    return defaultAlertCategoryCounts;
  }

  return datasetAlertCounts.get(featureName ?? null) ?? defaultAlertCategoryCounts;
};

/**
 * Fetch raw anomaly occurrence and failure counts over time
 * @param req
 * @param options
 */
export const getAnomalyCount = async (
  { datasetID, analyzerIDs, monitorIDs, timePeriod, segmentsOnly, segmentTags, ...rest }: GetAnomalyCountRequest,
  options?: CallOptions,
): Promise<AnomalyCount[]> => {
  const excludeOverall = !!(segmentsOnly || segmentTags?.length);
  const segmentString = tagsToDataServiceSegment(segmentTags ?? []);
  const req: GetAnomalyCountsRequest = {
    datasetIds: [datasetID],
    analyzerIds: ifNotEmpty(analyzerIDs),
    monitorIds: ifNotEmpty(monitorIDs),
    granularity: getDataServiceGranularity(timePeriod),
    excludeSegments: excludeOverall ? [''] : undefined,
    segments: segmentString ? [segmentString] : undefined,
    ...rest,
    readPgMonitor: await readPostgresMonitor(rest.orgId, options),
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.analysis.getAnomalyCountsQuery(req), options);

  return sortBy(
    data.map((result) => ({
      timestamp: result.ts,
      count: result.anomalies,
      anomalyCount: result.anomalies,
      failedCount: result.failures,
      resultCount: result.overall,
    })),
    ['timestamp'],
  );
};
