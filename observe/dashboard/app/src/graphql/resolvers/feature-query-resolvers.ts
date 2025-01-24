import {
  CategoricalAnomalyCountRequest,
  GetLatestAnomalyRequest,
} from '../../services/data/data-service/queries/analysis-queries';
import { FeatureSketchesRequest } from '../../services/data/data-service/queries/feature-queries';
import { FullGraphQLContext } from '../context';
import {
  AlertCategoryCounts,
  AnalysisResult,
  Feature,
  FeatureAlertCountsV2Args,
  FeatureResolvers,
  FeatureSketch,
  FeatureWeight,
  GranularityInclusion,
  SegmentTag,
} from '../generated/graphql';
import { getFilteredAnalysisResults } from './helpers/analysis-results';
import { extractRequiredMetrics } from './helpers/data-metrics';

/**
 * Fetch anomaly counts for the selected feature
 * @param parent The feature
 * @param args args from the GQL query
 * @param context GQL request context
 */
const getAnomalyCountsForFeature = async (
  parent: Feature,
  args: FeatureAlertCountsV2Args,
  context: FullGraphQLContext,
): Promise<AlertCategoryCounts> => {
  const req: CategoricalAnomalyCountRequest = {
    key: {
      orgId: context.resolveUserOrgID(),
      segmentTags: parent.tags,
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp ?? context.requestTime,
      timePeriod: parent.modelTimePeriod,
      groupBy: args.groupBy ?? undefined,
      granularityInclusion: args.granularityInclusion ?? GranularityInclusion.RollupOnly,
    },
    params: {
      datasetId: parent.modelId,
      featureName: parent.name,
      monitorIDs: new Set(args.filter?.monitorIDs),
      analyzerIDs: new Set(args.filter?.analyzerIDs),
      runIds: new Set(args.filter?.adhocRunId ? [args.filter?.adhocRunId] : []),
    },
  };

  return context.dataSources.dataService.getCategoricalAnomalyCounts(req);
};

export const FeatureQueryResolvers: FeatureResolvers<FullGraphQLContext> = {
  name: (parent): string => parent.name,
  modelName: (parent): string => parent.modelName,
  alertCountsV2: getAnomalyCountsForFeature,
  anomalyCounts: getAnomalyCountsForFeature,
  sketches: async (parent, { from, to, histogramSplitPoints }, context, info): Promise<FeatureSketch[]> => {
    const { dataSources, requestTime, resolveUserOrgID } = context;
    const req: FeatureSketchesRequest = {
      key: {
        orgId: resolveUserOrgID(),
        datasetId: parent.modelId,
        segmentTags: parent.tags,
        timePeriod: parent.modelTimePeriod,
        fromTime: from,
        toTime: to ?? requestTime,
        histogramSplitPoints: histogramSplitPoints ?? undefined,
      },
      params: {
        featureName: parent.name,
        metrics: extractRequiredMetrics(info), // this will be ignored in druid query
      },
    };

    return dataSources.dataService.getProfileRollup(req);
  },
  latestAnomalyTimestamp: async (parent, args, context): Promise<number | null> => {
    const req: GetLatestAnomalyRequest = {
      key: {
        orgId: context.resolveUserOrgID(),
        tags: parent.tags,
        requestTime: context.requestTime,
        column: parent.name,
        analyzerIDs: args.analyzerIds ?? null,
        monitorIDs: args.monitorIds ?? null,
      },
      params: { datasetId: parent.modelId },
    };

    return context.dataSources.dataService.getLatestAnomaly(req);
  },
  analysisResults: async (parent, args, context): Promise<AnalysisResult[]> =>
    getFilteredAnalysisResults(
      {
        ...args.filter,
        datasetId: parent.modelId,
        segmentTags: parent.tags,
        columns: [parent.name],
      },
      args.sortDirection,
      context,
    ),
  anomalies: async (parent, args, context): Promise<AnalysisResult[]> =>
    getFilteredAnalysisResults(
      {
        ...args.filter,
        datasetId: parent.modelId,
        segmentTags: parent.tags,
        columns: [parent.name],
        anomaliesOnly: true,
      },
      args.sortDirection,
      context,
    ),
  weight: async (parent, args, context): Promise<FeatureWeight | null> => {
    if (parent.weight) {
      // already populated from upstream
      return parent.weight;
    }

    const orgId = context.resolveUserOrgID();
    const datasetId = parent.modelId;
    const tags: SegmentTag[] = parent.tags;
    const feature = parent.name;

    const featureWeight = await context.dataSources.featureWeights.getBatchFeatureWeights({
      key: { orgId, datasetId, tags },
      params: { feature },
    });

    return featureWeight?.weights.get(feature) ?? null;
  },
};
