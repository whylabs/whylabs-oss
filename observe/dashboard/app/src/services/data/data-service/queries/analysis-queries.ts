import { Maybe } from '@graphql-tools/utils';
import { GetAnalyzerResultRequest, GranularityInclusion } from '@whylabs/data-service-node-client';

import { MAX_POSTGRES_DB_ITEMS } from '../../../../constants';
import { analysisMetricToDataService } from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import { gqlToSortOrder } from '../../../../graphql/contract-converters/data-service/misc-converter';
import {
  AlertCategoryCounts,
  AnalysisMetric,
  AnomalyCountGroupBy,
  SegmentTag,
  SortDirection,
  TimePeriod,
} from '../../../../graphql/generated/graphql';
import { CallOptions } from '../../../../util/async-helpers';
import { ifNotEmpty, notNullish } from '../../../../util/misc';
import { BatchableRequest, paramSetsToArrays } from '../../data-utils';
import { tagsToDataServiceSegment } from '../data-service-utils';

export type GetBatchableAnalysisRequest = BatchableRequest<GetAnalysisRequestKey, GetAnalysisRequestParams>;

export type GetAnalysisRequest = GetAnalysisRequestKey & GetAnalysisRequestParams;

// Non-batchable portion of the GetAnalysisRequest
// Requests to Druid will be grouped by these properties
export type GetAnalysisRequestKey = {
  orgId: string;
  interval: string;
  sortDirection: SortDirection;
  anomaliesOnly: boolean;
  includeFailed: boolean;
  includeUnhelpful?: boolean;
  granularityInclusion?: GranularityInclusion;
  offset?: number;
  limit?: number;
  // if you add properties here, consider if it is also needed in GetAnomalyCountRequest
};

// Batchable portion of the GetAnalysisRequest
// Requests to Postgres will aggregate the values in these properties
export type GetAnalysisRequestParams = {
  metrics?: Set<AnalysisMetric>;
  datasetIds?: Set<string>;
  columns?: Set<string>;
  analyzerTypes?: Set<string>;
  analyzerIDs?: Set<string>;
  monitorIDs?: Set<string>;
  analysisIDs?: Set<string>;
  segmentTags: SegmentTag[] | null; // null = no segment filter, [] = overall segment
  runIds?: Set<string>;
  // If you add a property here, make sure to update filterAnalysisResults and consider GetAnomalyCountRequest
};

export type GetLatestAnomalyRequest = BatchableRequest<GetLatestAnomalyRequestKey, GetLatestAnomalyRequestParams>;

export type GetLatestAnomalyRequestKey = {
  orgId: string;
  requestTime: number;
  tags: SegmentTag[];
  column: string | null;
  analyzerIDs: string[] | null;
  monitorIDs: string[] | null;
};

export type GetLatestAnomalyRequestParams = {
  datasetId: string;
};

/**
 * If any of the segments were null, the caller wants all segments including overall segment so return undefined
 * so that the filter field is not included in the query.
 * @param segmentTagBag
 */
const mergeSegmentParams = (segmentTagBag: Maybe<SegmentTag[]>[]): string[] | undefined => {
  if (!segmentTagBag.length || !segmentTagBag.every(notNullish)) {
    return undefined;
  }
  return segmentTagBag.map(tagsToDataServiceSegment);
};

export const getAnalyzerResultsQuery = (
  key: GetAnalysisRequestKey,
  params: GetAnalysisRequestParams[],
): GetAnalyzerResultRequest => {
  const { interval, orgId, anomaliesOnly, includeFailed, includeUnhelpful, granularityInclusion, sortDirection } = key;

  const { datasetIds, columns, metrics, analyzerTypes, analysisIDs, monitorIDs, analyzerIDs, runIds } =
    paramSetsToArrays(params, [
      'datasetIds',
      'columns',
      'metrics',
      'analyzerTypes',
      'analysisIDs',
      'monitorIDs',
      'analyzerIDs',
      'runIds',
    ]);

  const segments = mergeSegmentParams(params.map((p) => p.segmentTags));
  return {
    orgId,
    datasetIds,
    analyzerIds: ifNotEmpty(analyzerIDs),
    monitorIds: ifNotEmpty(monitorIDs),
    columnNames: ifNotEmpty(columns),
    metrics: ifNotEmpty(metrics.map(analysisMetricToDataService)),
    analyzerTypes: ifNotEmpty(analyzerTypes),
    segments,
    runIds: ifNotEmpty(runIds),
    adhoc: !!ifNotEmpty(runIds),
    analysisIds: ifNotEmpty(analysisIDs),
    order: gqlToSortOrder(sortDirection),
    interval,
    onlyAnomalies: anomaliesOnly,
    includeFailures: includeFailed,
    includeUnhelpful: includeUnhelpful,
    granularityInclusion: granularityInclusion ?? GranularityInclusion.RollupOnly,
    offset: key?.offset,
    limit: key?.limit ?? MAX_POSTGRES_DB_ITEMS,
  };
};

export type GetAnomalyCountRequest = {
  orgId: string;
  interval: string;
  timePeriod: TimePeriod;
  datasetID: string;
  segmentsOnly?: boolean;
  segmentTags?: SegmentTag[] | null;
  analyzerIDs?: string[];
  monitorIDs?: string[];
  granularityInclusion: GranularityInclusion;
};

export const defaultAlertCategoryCounts: AlertCategoryCounts = { totals: [], timeseries: [] };

export type CategoricalAnomalyCountRequest = BatchableRequest<AlertCountRequestKey, AlertCountRequestParams>;

export type AlertCountRequestKey = {
  orgId: string;
  fromTimestamp: number;
  toTimestamp: number;
  segmentTags: SegmentTag[] | null;
  timePeriod: TimePeriod;
  groupBy?: AnomalyCountGroupBy;
  granularityInclusion: GranularityInclusion;
};

export type AlertCountRequestParams = {
  datasetId: string;
  featureName?: string;
  monitorIDs?: Set<string>;
  analyzerIDs?: Set<string>;
  runIds?: Set<string>;
};

export type SetFalseAlarmRequest = {
  orgId: string;
  analysisId: string;
  isUnhelpful: boolean;
};

export const readPostgresMonitor = async (orgId: string, options?: CallOptions): Promise<boolean> => {
  return true;
};
