import { GranularityInclusion } from '@whylabs/data-service-node-client';

import { getInterval } from '../../../services/data/data-service/data-service-utils';
import { GetAnomalyCountRequest } from '../../../services/data/data-service/queries/analysis-queries';
import {
  getFilteredAnalysisResultsWrapper,
  getPaginatedAnalysisResultsWrapper,
} from '../../../services/data/monitor/monitor';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { FullGraphQLContext } from '../../context';
import {
  AnalysisFilter,
  AnalysisResult,
  AnalyzerAnomalyCount,
  AnomalyCount,
  AnomalyFilter,
  SortDirection,
  TimePeriod,
} from '../../generated/graphql';

/**
 * Fetches analysis results matching the filter and the supplied sort order
 * @param filter Analysis results filter
 * @param sortDirection Sort direction....
 * @param context GQL request context
 */
export const getFilteredAnalysisResults = async (
  filter: AnalysisFilter,
  sortDirection: SortDirection,
  context: FullGraphQLContext,
): Promise<AnalysisResult[]> => {
  const { resolveUserOrgID, dataSources, requestTime } = context;
  const orgId = resolveUserOrgID();

  return getFilteredAnalysisResultsWrapper({
    callOptions: callOptionsFromGraphqlCxt(context),
    dataService: dataSources.dataService,
    filter,
    orgId,
    requestTime,
    sortDirection,
  });
};

/**
 * Fetches paginated, filtered analysis results
 * @param filter Analysis results filter
 * @param limit
 * @param offset
 * @param sortDirection Sort direction....
 * @param context GQL request context
 */
export const getPaginatedAnalysisResults = async (
  filter: AnalysisFilter,
  limit: number,
  offset: number,
  sortDirection: SortDirection,
  context: FullGraphQLContext,
): Promise<AnalysisResult[]> => {
  const orgId = context.resolveUserOrgID();
  return getPaginatedAnalysisResultsWrapper({
    dataService: context.dataSources.dataService,
    filter,
    limit,
    orgId,
    offset,
    requestTime: context.requestTime,
    sortDirection,
  });
};

export const getAnalysisResult = async (
  analysisId: string,
  context: FullGraphQLContext,
): Promise<AnalysisResult | null> => {
  const results = await getFilteredAnalysisResults(
    {
      anomaliesOnly: false,
      fromTimestamp: 0,
      toTimestamp: context.requestTime,
      analysisIDs: [analysisId],
    },
    SortDirection.Desc,
    context,
  );

  return results.pop() ?? null;
};

/**
 * Fetch overall anomaly count for a dataset on a specified period
 * @param filter Anomaly filter
 * @param timePeriod
 * @param context GQL request context
 * @param segmentsOnly If true, only anomalies on segments will be counted
 * @param granularityInclusion Whether to include rollup, individual or both
 */
export const getAnomalyCount = async ({
  filter,
  timePeriod,
  context,
  segmentsOnly = false,
  granularityInclusion = GranularityInclusion.RollupOnly,
}: {
  filter: AnomalyFilter;
  timePeriod: TimePeriod;
  context: FullGraphQLContext;
  segmentsOnly?: boolean;
  granularityInclusion: GranularityInclusion;
}): Promise<AnomalyCount[]> => {
  const req: GetAnomalyCountRequest = {
    orgId: context.resolveUserOrgID(),
    datasetID: filter.datasetId,
    interval: getInterval(filter.fromTimestamp, filter.toTimestamp ?? context.requestTime),
    timePeriod,
    monitorIDs: filter.monitorIDs ?? undefined,
    analyzerIDs: filter.analyzerIDs ?? undefined,
    segmentsOnly,
    granularityInclusion,
  };

  return context.dataSources.dataService.getAnomalyCount(req, callOptionsFromGraphqlCxt(context));
};

/**
 * Fetch anomaly count by analyzer for a dataset on a specified period
 * @param datasetId
 * @param fromTimestamp
 * @param toTimestamp
 * @param analyzerIds
 * @param timePeriod granularity, including ALL
 * @param context GQL request context
 */
export const getAnomalyCountByAnalyzer = async ({
  datasetId,
  fromTimestamp,
  toTimestamp,
  analyzerIds,
  context,
  granularityInclusion = GranularityInclusion.RollupOnly,
}: {
  datasetId: string;
  fromTimestamp: number;
  toTimestamp: number;
  analyzerIds: string[];
  context: FullGraphQLContext;
  granularityInclusion: GranularityInclusion;
}): Promise<AnalyzerAnomalyCount[]> => {
  const orgId = context.resolveUserOrgID();
  const requests = analyzerIds.map((id) =>
    context.dataSources.dataService.getAnomalyCount(
      {
        orgId,
        datasetID: datasetId,
        interval: getInterval(fromTimestamp, toTimestamp ?? context.requestTime),
        timePeriod: TimePeriod.All,
        analyzerIDs: [id],
        granularityInclusion,
      },
      callOptionsFromGraphqlCxt(context),
    ),
  );
  const countArrays = await Promise.all(requests);
  const emptyCount = { anomalyCount: 0, failedCount: 0, resultCount: 0 };

  return countArrays.map((c, index) => {
    const countData = c.length ? c[0] : emptyCount;
    return {
      analyzerId: analyzerIds[index],
      ...countData,
      __typename: 'AnalyzerAnomalyCount',
    };
  });
};
