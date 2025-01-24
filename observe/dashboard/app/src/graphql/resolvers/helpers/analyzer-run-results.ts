import { validatePaginationLimit } from '../../../util/validation';
import { FullGraphQLContext } from '../../context';
import { AnalyzerRunCountResult, AnalyzerRunFilter, AnalyzerRunResult, SortDirection } from '../../generated/graphql';

/**
 * Fetches analyzer runs matching the filter and the supplied sort order
 * @param filter Analyzer run filter
 * @param sortDirection Sort direction
 * @param context GQL request context
 */
export const getPaginatedAnalyzerRuns = async (
  filter: AnalyzerRunFilter,
  limit: number,
  offset: number,
  sortDirection: SortDirection,
  { dataSources, resolveUserOrgID, requestTime }: FullGraphQLContext,
): Promise<AnalyzerRunResult[]> => {
  const { fromTimestamp, toTimestamp, datasetId, analyzerId, monitorId } = filter;
  validatePaginationLimit(limit);

  const params = {
    fromTimestamp: fromTimestamp,
    toTimestamp: toTimestamp ?? requestTime,
    orgId: resolveUserOrgID(),
    datasetId,
    sortDirection,
    limit,
    offset,
    analyzerIds: analyzerId ? [analyzerId] : [],
    monitorIds: monitorId ? [monitorId] : [],
  };

  return dataSources.dataService.getPaginatedRuns(params);
};

/**
 * Fetches analyzer runs matching the filter and the supplied sort order
 * @param filter Analyzer run filter
 * @param context GQL request context
 */
export const getAnalyzerRunCount = async (
  filter: AnalyzerRunFilter,
  { dataSources, resolveUserOrgID, requestTime }: FullGraphQLContext,
): Promise<AnalyzerRunCountResult> => {
  const { fromTimestamp, toTimestamp, datasetId, analyzerId, monitorId } = filter;

  const params = {
    orgId: resolveUserOrgID(),
    datasetId,
    fromTimestamp,
    toTimestamp: toTimestamp ?? requestTime,
    analyzerIds: analyzerId ? [analyzerId] : [],
    monitorIds: monitorId ? [monitorId] : [],
  };

  return dataSources.dataService.getAnalyzerRunCount(params);
};
