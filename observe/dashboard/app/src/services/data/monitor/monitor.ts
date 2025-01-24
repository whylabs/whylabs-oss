import { GranularityInclusion } from '@whylabs/data-service-node-client';

import { AnalysisFilter, AnalysisResult, SortDirection } from '../../../graphql/generated/graphql';
import { CallOptions } from '../../../util/async-helpers';
import { validatePaginationLimit } from '../../../util/validation';
import { getInterval } from '../data-service/data-service-utils';
import { GetAnalysisRequestParams } from '../data-service/queries/analysis-queries';
import { DataServiceSource } from '../datasources/data-service-source';
import { PartialMonitorConfig } from '../monitor/coverage';
import { getMonitorConfigV3 } from '../songbird/api-wrappers/monitor-config';

const translateIncludeUnhelpful = (includeUnhelpful?: boolean | null): boolean | undefined => {
  if (includeUnhelpful === null) return undefined;
  return includeUnhelpful;
};

const filterToAnalysisRequestParams = (filter: AnalysisFilter): GetAnalysisRequestParams => ({
  datasetIds: new Set(filter.datasetId != null ? [filter.datasetId] : []),
  segmentTags: filter.segmentTags ?? null,
  columns: new Set(filter.columns),
  analyzerTypes: new Set(filter.analyzerTypes),
  metrics: new Set(filter.metrics),
  analyzerIDs: new Set(filter.analyzerIDs),
  monitorIDs: new Set(filter.monitorIDs),
  analysisIDs: new Set(filter.analysisIDs),
  runIds: new Set(filter.adhocRunId ? [filter.adhocRunId] : []),
});

export const getFilteredAnalysisResultsWrapper = async ({
  callOptions,
  dataService,
  filter,
  orgId,
  requestTime,
  sortDirection,
}: {
  callOptions: CallOptions;
  dataService: DataServiceSource;
  filter: AnalysisFilter;
  orgId: string;
  requestTime: number;
  sortDirection: SortDirection;
}): Promise<AnalysisResult[]> => {
  const {
    anomaliesOnly,
    datasetId,
    includeFailed,
    includeUnhelpful,
    fromTimestamp,
    toTimestamp,
    granularityInclusion,
  } = filter;

  const result = await dataService.getAnalyzerResults({
    key: {
      anomaliesOnly,
      includeFailed: includeFailed ?? false,
      includeUnhelpful: translateIncludeUnhelpful(includeUnhelpful),
      interval: getInterval(fromTimestamp ?? 0, toTimestamp ?? requestTime),
      granularityInclusion: granularityInclusion ?? GranularityInclusion.RollupOnly,
      orgId,
      sortDirection,
    },
    params: filterToAnalysisRequestParams(filter),
  });

  const monitorConfig: PartialMonitorConfig | null = await (() => {
    if (!datasetId) return null;
    return getMonitorConfigV3(orgId, datasetId, false, false, callOptions);
  })();

  if (!monitorConfig) return result;

  // Map analyzerId to monitorDisplayName
  const monitorDisplayNameMap = new Map<string, string>(
    monitorConfig.monitors?.flatMap(({ analyzerIds, displayName }) => {
      const analyzerId = analyzerIds?.[0];
      if (analyzerId && displayName) return [[analyzerId, displayName]];
      return [];
    }),
  );

  return result.map((an) => {
    const monitorDisplayName = (() => {
      if (an.analyzerId) return monitorDisplayNameMap.get(an.analyzerId);
      return null;
    })();

    return { ...an, monitorDisplayName };
  });
};

export const getPaginatedAnalysisResultsWrapper = async ({
  dataService,
  filter,
  limit,
  offset,
  orgId,
  requestTime,
  sortDirection,
}: {
  dataService: DataServiceSource;
  filter: AnalysisFilter;
  limit: number;
  offset: number;
  orgId: string;
  requestTime: number;
  sortDirection: SortDirection;
}): Promise<AnalysisResult[]> => {
  const { anomaliesOnly, includeFailed, includeUnhelpful, fromTimestamp, toTimestamp, granularityInclusion } = filter;
  validatePaginationLimit(limit);

  return dataService.getAnalyzerResults({
    key: {
      orgId,
      interval: getInterval(fromTimestamp ?? 0, toTimestamp ?? requestTime),
      anomaliesOnly,
      includeFailed: includeFailed ?? false,
      includeUnhelpful: translateIncludeUnhelpful(includeUnhelpful),
      granularityInclusion: granularityInclusion ?? GranularityInclusion.RollupOnly,
      sortDirection,
      offset: offset,
      limit: limit,
    },
    params: filterToAnalysisRequestParams(filter),
  });
};
