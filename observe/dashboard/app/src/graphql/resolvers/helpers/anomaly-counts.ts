import { AnomalyCountBySegmentRequest } from '../../../services/data/data-service/api-wrappers/anomaly-counts';
import { CategoricalAnomalyCountRequest } from '../../../services/data/data-service/queries/analysis-queries';
import { FullGraphQLContext } from '../../context';
import {
  AlertCategory,
  AlertCategoryCounts,
  AnomalyCountGroupBy,
  DatasetAlertCountsV2Args,
  GranularityInclusion,
  SegmentTag,
  TimePeriod,
} from '../../generated/graphql';

/**
 * Materializes total counts based on the alert count timeseries
 * @param alertCategoryCounts
 */
export const getAnomalyCountTotals = (alertCategoryCounts: AlertCategoryCounts): AlertCategoryCounts['totals'] => {
  const alertsByCategory = alertCategoryCounts.timeseries.reduce((map, batch) => {
    for (const alertCount of batch.counts) {
      const existingCount = map.get(alertCount.category) ?? 0;
      map.set(alertCount.category, existingCount + alertCount.count);
    }

    return map;
  }, new Map<AlertCategory, number>());
  return Array.from(alertsByCategory.keys()).map((category) => ({
    category,
    count: alertsByCategory.get(category) ?? 0,
  }));
};

/**
 * Fetch anomaly counts for the whole dataset by category
 * @param datasetId
 * @param segmentTags
 * @param timePeriod
 * @param args args from the GQL query
 * @param context GQL request context
 */
export const getAnomalyCountsForDataset = async (
  datasetId: string,
  segmentTags: SegmentTag[] | null,
  timePeriod: TimePeriod,
  args: DatasetAlertCountsV2Args,
  context: FullGraphQLContext,
): Promise<AlertCategoryCounts> => {
  const req: CategoricalAnomalyCountRequest = {
    key: {
      orgId: context.resolveUserOrgID(),
      segmentTags,
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp ?? context.requestTime,
      timePeriod,
      groupBy: args.groupBy ?? undefined,
      granularityInclusion: args.granularityInclusion ?? GranularityInclusion.RollupOnly,
    },
    params: {
      datasetId,
      monitorIDs: new Set(args.filter?.monitorIDs),
      analyzerIDs: new Set(args.filter?.analyzerIDs),
      runIds: new Set(args.filter?.adhocRunId ? [args.filter?.adhocRunId] : []),
    },
  };
  return context.dataSources.dataService.getCategoricalAnomalyCounts(req);
};

/**
 * Fetch anomaly counts for overall dataset or segment or all segments by category
 * @param datasetId
 * @param segmentTags
 * @param timePeriod
 * @param args args from the GQL query
 * @param context GQL request context
 */
export const getAnomalyCountsByCategory = async (
  datasetId: string,
  segmentTags: SegmentTag[] | null,
  timePeriod: TimePeriod,
  args: DatasetAlertCountsV2Args,
  context: FullGraphQLContext,
): Promise<AlertCategoryCounts> => {
  if (!segmentTags) return getAnomalyCountsForDataset(datasetId, segmentTags, timePeriod, args, context);

  const req: AnomalyCountBySegmentRequest = {
    key: {
      orgId: context.resolveUserOrgID(),
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp ?? context.requestTime,
      timePeriod,
      groupBy: args.groupBy ?? AnomalyCountGroupBy.Category,
    },
    params: {
      datasetId,
      segmentTags,
      monitorIDs: new Set(args.filter?.monitorIDs),
      analyzerIDs: new Set(args.filter?.analyzerIDs),
      runIds: new Set(args.filter?.adhocRunId ? [args.filter?.adhocRunId] : []),
    },
  };
  return context.dataSources.dataService.getAnomalyCountsBySegment(req);
};
