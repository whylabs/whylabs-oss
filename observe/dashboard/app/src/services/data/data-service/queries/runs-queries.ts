import { GetAnalyzerRunsRequest } from '@whylabs/data-service-node-client';

import { gqlToSortOrder } from '../../../../graphql/contract-converters/data-service/misc-converter';
import { SortDirection } from '../../../../graphql/generated/graphql';
import { ifNotEmpty } from '../../../../util/misc';
import { getInterval } from '../data-service-utils';

export type GetAnalyzerRunRequest = {
  orgId: string;
  datasetId: string;
  fromTimestamp: number;
  toTimestamp: number;
  analyzerIds?: string[];
  monitorIds?: string[];
};

export type GetPaginatedRunsRequest = GetAnalyzerRunRequest & {
  sortDirection: SortDirection;
  limit: number;
  offset: number;
};

export const getPaginatedRunsQuery = (params: GetPaginatedRunsRequest): GetAnalyzerRunsRequest => {
  const { fromTimestamp, toTimestamp, orgId, limit, offset, sortDirection, monitorIds, analyzerIds, datasetId } =
    params;

  return {
    orgId,
    datasetIds: [datasetId],
    analyzerIds: ifNotEmpty(analyzerIds),
    monitorIds: ifNotEmpty(monitorIds),
    order: gqlToSortOrder(sortDirection),
    interval: getInterval(fromTimestamp, toTimestamp),
    limit,
    offset,
  };
};

export const getAnalyzerRunCountQuery = (params: GetAnalyzerRunRequest): GetAnalyzerRunsRequest => {
  const { fromTimestamp, toTimestamp, orgId, monitorIds, analyzerIds, datasetId } = params;

  return {
    orgId,
    datasetIds: [datasetId],
    analyzerIds: ifNotEmpty(analyzerIds),
    monitorIds: ifNotEmpty(monitorIds),
    interval: getInterval(fromTimestamp, toTimestamp),
  };
};
