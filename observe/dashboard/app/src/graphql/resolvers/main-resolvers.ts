import { IResolvers } from '@graphql-tools/utils';
import { AsyncAnalysisQueue } from '@whylabs/data-service-node-client';
import { v4 } from 'uuid';

import { GenericDashbirdError } from '../../errors/dashbird-error';
import { getLogger } from '../../providers/logger';
import { listDashboards } from '../../services/data/data-service/api-wrappers/custom-dashboards';
import {
  getSegmentTags,
  getSortedSegmentTags,
  isSegmentExactMatch,
  isSegmentPartialMatch,
} from '../../services/data/data-service/api-wrappers/segments';
import { getTracesSummary, parseTraceEntryCounts } from '../../services/data/data-service/api-wrappers/traces';
import { Maybe } from '../../services/data/data-service/data-service-types';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import { SegmentSummary } from '../../services/data/data-service/queries/segment-queries';
import { getMaintenanceBanner } from '../../services/data/maintenance-status';
import { getMonitorCoverageForDataset, getMonitorCoverageForOrg } from '../../services/data/monitor/coverage';
import { listColumnActiveMonitors } from '../../services/data/monitor/monitor-targets';
import { listApiKeysForOrg } from '../../services/data/songbird/api-wrappers/api-keys';
import {
  getAnalyzer,
  getMonitor,
  getMonitorConfigV3,
  validateMonitorConfigV3,
} from '../../services/data/songbird/api-wrappers/monitor-config';
import { filterResources, getModel, getModels } from '../../services/data/songbird/api-wrappers/resources';
import { formatGraphQLContext } from '../../services/errors/error-wrapper';
import { parseFromDataServiceDashboard } from '../../trpc/dashboard/util/CustomDashboardSchemaParser';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { IntegrationCardData, getIntegrationsCards } from '../../util/integration-cards-util';
import { describeTags, notImplemented, notNullish, pageArray } from '../../util/misc';
import { toHumanReadableTime } from '../../util/time';
import { validatePaginationLimit } from '../../util/validation';
import { FullGraphQLContext } from '../context';
import { dataServiceSegmentToGQL } from '../contract-converters/data-service/segments-converter';
import { contractToGQLKeyMetadata } from '../contract-converters/songbird/api-key-metadata-converter';
import { roleToGQL } from '../contract-converters/songbird/membership-converter';
import {
  modelMetadataToModel,
  timePeriodToDataServiceGranularity,
} from '../contract-converters/songbird/model-converters';
import { filterSegmentTags } from '../filters/segment-filters';
import {
  AccessTokenMetadata,
  AlertCategory,
  AlertCategoryCounts,
  AnalysisResult,
  AnalyzerAnomalyCount,
  AnalyzerRunCountResult,
  AnalyzerRunResult,
  AnomalyCount,
  BackfillJobInfo,
  CustomDashboard,
  DataInvestigator,
  EventArchetype,
  FilteredFeatureSketches,
  GlobalActionsFetching,
  GranularityInclusion,
  InternalAdminInfo,
  JobStatus,
  LlmTraces,
  Masquerade,
  Model,
  ModelMetrics,
  ModelMetricsQueries,
  ModelType,
  ModelWeightMetadata,
  MonitorCoverage,
  Resolvers,
  Segment,
  SortDirection,
  TimePeriod,
  User,
} from '../generated/graphql';
import { DatasetQueryResolvers } from './dataset-query-resolvers';
import { FeatureQueryResolvers } from './feature-query-resolvers';
import {
  getAnalysisResult,
  getAnomalyCount,
  getAnomalyCountByAnalyzer,
  getFilteredAnalysisResults,
  getPaginatedAnalysisResults,
} from './helpers/analysis-results';
import { getAnalyzerRunCount, getPaginatedAnalyzerRuns } from './helpers/analyzer-run-results';
import { getAnomalyCountTotals, getAnomalyCountsForDataset } from './helpers/anomaly-counts';
import { getFilteredSketchesForBatch } from './helpers/batch-metadata';
import { getBaselineForDataset } from './helpers/dataset';

/* eslint-disable max-lines */

const logger = getLogger('GraphQLResolvers-Main');

const getDatasetById = async (datasetId: Maybe<string>, context: FullGraphQLContext): Promise<Model | null> => {
  logger.info('Fetching model %s', datasetId);
  const orgId = context.resolveUserOrgID();

  if (!datasetId) return null;

  const modelMeta = await getModel(orgId, datasetId, callOptionsFromGraphqlCxt(context));
  if (modelMeta == null) return null;

  return modelMetadataToModel(modelMeta);
};

const resolvers: Resolvers<FullGraphQLContext> = {
  Query: {
    customDashboards: async (parent, args, context): Promise<CustomDashboard[]> => {
      const dashboards = await listDashboards(context.resolveUserOrgID(), callOptionsFromGraphqlCxt(context));
      const list: CustomDashboard[] = [];

      dashboards.forEach((d) => {
        const schema = parseFromDataServiceDashboard(d);

        // Filter it by usedOn metadata
        if (schema?.metadata?.usedOn === args.usedOn) {
          list.push({ id: d.id, displayName: d.displayName });
        }
      });
      return list;
    },
    maintenanceBanner: getMaintenanceBanner,
    model: async (_, { id }, context): Promise<Model | null> => getDatasetById(id, context),
    models: async (parent, args, context): Promise<Model[]> => {
      const { datasetIDs, ...filters } = args;
      const orgId = context.resolveUserOrgID();
      const modelMetadata = await getModels(orgId, callOptionsFromGraphqlCxt(context));
      const filteredResources = filterResources(modelMetadata, { resourceIds: datasetIDs, ...filters });
      return filteredResources
        .map(modelMetadataToModel)
        .sort((a, b) => (b?.creationTime ?? 0) - (a?.creationTime ?? 0));
    },
    analysisResults: async (parent, args, context): Promise<AnalysisResult[]> =>
      getFilteredAnalysisResults(args.filter, args.sortDirection, context),
    paginatedAnalysisResults: async (parent, args, context): Promise<AnalysisResult[]> =>
      getPaginatedAnalysisResults(args.filter, args.limit, args.offset, args.sortDirection, context),
    analysisResult: async (parent, args, context): Promise<AnalysisResult | null> =>
      getAnalysisResult(args.analysisId, context),
    anomalyCount: async (parent, args, context): Promise<AnomalyCount[]> =>
      getAnomalyCount({
        filter: args.filter,
        timePeriod: args.timePeriod ?? TimePeriod.P1D,
        context,
        granularityInclusion: args.granularityInclusion ?? GranularityInclusion.RollupOnly,
      }),
    anomalyCountByAnalyzer: async (parent, args, context): Promise<AnalyzerAnomalyCount[]> =>
      getAnomalyCountByAnalyzer({
        datasetId: args.datasetId,
        fromTimestamp: args.fromTimestamp,
        toTimestamp: args.toTimestamp,
        analyzerIds: args.analyzerIDs,
        context,
        granularityInclusion: args.granularityInclusion ?? GranularityInclusion.RollupOnly,
      }),
    segmentedAnomalyCount: async (_, { datasetId, granularityInclusion, fromTimestamp, toTimestamp }, context) => {
      const anomalyCounts = await getAnomalyCount({
        filter: { datasetId, fromTimestamp, toTimestamp },
        timePeriod: TimePeriod.All,
        context,
        segmentsOnly: true,
        granularityInclusion: granularityInclusion ?? GranularityInclusion.RollupOnly,
      });
      return anomalyCounts.reduce((sum, count) => sum + count.count, 0);
    },
    anomalyCounts: async (parent, args, context): Promise<AlertCategoryCounts | null> => {
      const { datasetId, tags } = args;
      const dataset = await getDatasetById(datasetId, context);
      return dataset && getAnomalyCountsForDataset(datasetId, tags ?? null, dataset.batchFrequency, args, context);
    },
    analyzerRuns: async (parent, args, context): Promise<AnalyzerRunResult[]> =>
      getPaginatedAnalyzerRuns(args.filter, args.limit, args.offset, args.sortDirection ?? SortDirection.Desc, context),
    runCount: async (parent, args, context): Promise<AnalyzerRunCountResult> =>
      getAnalyzerRunCount(args.filter, context),
    integrationCards: async (): Promise<IntegrationCardData[]> => getIntegrationsCards(),
    user: async (parent, args, context): Promise<User> => {
      const { userContext } = context;
      const { auth0User, membership } = userContext;

      const { impersonation } = userContext;
      const masquerade: Masquerade | null = impersonation
        ? {
            expiration: toHumanReadableTime(impersonation.expiration),
            isActiveNow: impersonation.enabled,
          }
        : null;
      return {
        isAuthenticated: !!auth0User,
        emailVerified: !!auth0User?.email_verified,
        email: auth0User?.email,
        name: auth0User?.name,
        id: auth0User?.sub,
        auth0Id: auth0User?.sub,
        whyLabsId: membership?.userId,
        permissions: userContext.permissions,
        role: roleToGQL(userContext.membership?.role),
        metadata: {
          masquerade,
        },
        // joinedOrganizations will be resolved separately
        // organization will be resolved separately
        // preferences will be resolved separately
      };
    },
    accessTokens: async (parent, args, context): Promise<AccessTokenMetadata[]> => {
      const { offset, limit } = args;
      validatePaginationLimit(limit);
      const tokens = (await listApiKeysForOrg(context.resolveUserOrgID(), callOptionsFromGraphqlCxt(context)))
        // filter out revoked keys
        .filter((k) => !k.revoked)
        .map(contractToGQLKeyMetadata);

      return pageArray(tokens, offset, limit);
    },
    admin: async () => ({} as InternalAdminInfo), // implemented in admin resolvers
    adhocRunStatus: async (parent, args): Promise<JobStatus> => {
      if (args.numEvents === 0) {
        // 0 events means an ad hoc run won't have alerts to display, so we can return success instead of polling for nothing.
        return JobStatus.Succeeded;
      }
      return JobStatus.Succeeded; // results were written to postgres as part of the adhoc run
    },
    backfillRunStatus: async (_, { runId }, context) => {
      return context.dataSources.dataService.getBackfillAnalyzersJobStatus(runId, callOptionsFromGraphqlCxt(context));
    },
    queryBackfillJobs: async (_, args, context): Promise<BackfillJobInfo[]> => {
      const { datasetId, runId, onlyActive } = args;
      const orgId = context.resolveUserOrgID();
      return context.dataSources.dataService.getResourceBackfillAnalyzersJobs(
        {
          datasetId: datasetId ?? undefined,
          orgId,
          onlyActive: !!onlyActive,
          runId: runId ?? undefined,
          queue: AsyncAnalysisQueue.OnDemand,
        },
        callOptionsFromGraphqlCxt(context),
      );
    },
    monitorConfig: async (parent, args, context): Promise<string | null> => {
      const { datasetId } = args;
      const orgId = context.resolveUserOrgID();
      const monitorConfig = await getMonitorConfigV3(
        orgId,
        datasetId,
        false,
        false,
        callOptionsFromGraphqlCxt(context),
      );

      if (monitorConfig) return JSON.stringify(monitorConfig);
      return null;
    },
    columnMonitors: async (parent, args, context): Promise<string[]> => {
      const { datasetId, columnId, tags } = args;
      const orgId = context.resolveUserOrgID();
      return listColumnActiveMonitors(orgId, datasetId, columnId, tags ?? [], callOptionsFromGraphqlCxt(context));
    },
    validateMonitorConfig: async (parent, args, context): Promise<boolean> => {
      const { datasetId, config } = args;
      const orgId = context.resolveUserOrgID();
      await validateMonitorConfigV3(orgId, datasetId, config, callOptionsFromGraphqlCxt(context));
      return true;
    },
    analyzer: async (parent, args, context): Promise<string | null> => {
      const { datasetId, analyzerId } = args;
      const orgId = context.resolveUserOrgID();
      const analyzerConfig = await getAnalyzer(orgId, datasetId, analyzerId, callOptionsFromGraphqlCxt(context));
      return JSON.stringify(analyzerConfig);
    },
    monitor: async (parent, args, context): Promise<string | null> => {
      const { datasetId, monitorId } = args;
      const orgId = context.resolveUserOrgID();
      const config = await getMonitor(orgId, datasetId, monitorId, callOptionsFromGraphqlCxt(context));
      return JSON.stringify(config);
    },
    dataQueries: async () => ({} as DataInvestigator), // implemented in data-investigator resolvers
    modelMetrics: async () => ({} as ModelMetricsQueries), // implemented in data-investigator resolvers
    globalActions: () => ({} as GlobalActionsFetching), // implemented in global-actions resolvers
    searchSegmentKeys: async (parent, args, context): Promise<string[] | null> => {
      const { datasetId, tags, searchString, limitSpec } = args;
      if (!datasetId) {
        throw new GenericDashbirdError('Trying to search segment keys without a valid datasetId');
      }
      const orgId = context.resolveUserOrgID();
      const segments = await getSegmentTags(
        { datasetId, orgId, filter: { substring: searchString, tags } },
        callOptionsFromGraphqlCxt(context),
      );
      const searchableTags = segments.flatMap((s) => s.segment?.tags).filter(notNullish);

      return filterSegmentTags(searchableTags, tags ?? [], 'key', limitSpec, searchString);
    },
    searchSegmentValues: async (parent, args, context): Promise<string[] | null> => {
      const { datasetId, tags, key, searchString, limitSpec } = args;
      if (!datasetId) {
        throw new GenericDashbirdError('Trying to search segment values without a valid datasetId');
      }
      const orgId = context.resolveUserOrgID();
      const segments = await getSegmentTags(
        { orgId, datasetId, filter: { substring: searchString, tags } },
        callOptionsFromGraphqlCxt(context),
      );
      const searchableTags = segments
        .flatMap((s) => s.segment?.tags)
        .filter(notNullish)
        .filter((t) => t.key === key);

      return filterSegmentTags(searchableTags, tags ?? [], 'value', limitSpec, searchString);
    },
    monitorCoverage: async (parent, args, context): Promise<MonitorCoverage[]> =>
      getMonitorCoverageForOrg(context.resolveUserOrgID()),
  },
  Model: {
    segment: async (parent, args, context): Promise<Segment | null> => {
      const { tags } = args;
      const orgId = context.resolveUserOrgID();

      if (!tags?.length)
        return {
          alerts: parent.alerts,
          batchDateRanges: parent.batchDateRanges,
          batchFrequency: parent.batchFrequency,
          batches: parent.batches,
          datasetId: parent.datasetId,
          datasetMetrics: parent.datasetMetrics,
          customMetrics: parent.customMetrics,
          events: parent.events,
          features: parent.features,
          filteredFeatures: parent.filteredFeatures,
          filteredOutputs: parent.filteredOutputs,
          id: v4(),
          modelId: parent.datasetId,
          modelName: parent.name,
          modelType: parent.modelType,
          name: describeTags([]),
          outputs: parent.outputs,
          tags: [],
          resourceTags: parent.resourceTags,
          creationTime: parent.creationTime,
          insights: parent.insights,
        };

      const [baseline, segments] = await Promise.all([
        getBaselineForDataset(parent, context),
        getSegmentTags({ orgId, datasetId: parent.datasetId, filter: { tags } }, callOptionsFromGraphqlCxt(context)),
      ]);

      const exactMatch = segments.find((segment) => isSegmentExactMatch(tags, segment.segment.tags ?? []));

      if (exactMatch) {
        // requested segment exists in the data
        return dataServiceSegmentToGQL(parent, baseline, exactMatch);
      }

      const partialMatch = segments.find((segment) => isSegmentPartialMatch(segment.segment.tags, tags));

      if (partialMatch) {
        // requested segment doesn't exist in the data, but can be constructed by merging existing segments
        const logicalSegment: SegmentSummary = { segment: { tags } };

        return dataServiceSegmentToGQL(parent, baseline, logicalSegment);
      }

      // segment doesn't exist in the data at all
      return null;
    },
    segments: async (parent, args, context): Promise<Segment[]> => {
      const { offset, filter, sort, limit } = args;
      validatePaginationLimit(limit);
      const orgId = context.resolveUserOrgID();

      const [baseline, segments] = await Promise.all([
        getBaselineForDataset(parent, context),
        getSortedSegmentTags(
          { orgId, datasetId: parent.datasetId, filter: filter ?? {}, sort },
          callOptionsFromGraphqlCxt(context),
        ),
      ]);

      return pageArray(
        segments.map((s) => dataServiceSegmentToGQL(parent, baseline, s)),
        offset,
        limit,
      );
    },
    monitorConfigAuditLogs: () => {
      return notImplemented();
    },
    allAnomalyCounts: ({ datasetId, batchFrequency }, args, context) =>
      getAnomalyCountsForDataset(datasetId, null, batchFrequency, args, context),
    totalFeatures: async (parent, args, context): Promise<number> => {
      const { features } = await getBaselineForDataset(parent, context);
      return features.length;
    },
    totalSegments: async (parent, args, context): Promise<number> => {
      const orgId = context.resolveUserOrgID();
      const segments = await getSegmentTags(
        { orgId, datasetId: parent.datasetId, filter: {} },
        callOptionsFromGraphqlCxt(context),
      );
      return segments.length;
    },
    totalFilteredSegments: async (parent, args, context): Promise<number> => {
      const orgId = context.resolveUserOrgID();
      const segments = await getSortedSegmentTags(
        { orgId, datasetId: parent.datasetId, filter: args.filter ?? {} },
        callOptionsFromGraphqlCxt(context),
      );
      return segments.length;
    },
    hasWeights: async (parent, args, context): Promise<boolean> => {
      const datasetsWithWeights = await context.dataSources.featureWeights.getFeatureWeights({
        orgId: context.resolveUserOrgID(),
        datasetId: parent.datasetId,
      });

      return !!datasetsWithWeights;
    },
    weightMetadata: async (parent, args, context): Promise<ModelWeightMetadata> => {
      const datasetsWithWeights = await context.dataSources.featureWeights.getFeatureWeights({
        orgId: context.resolveUserOrgID(),
        datasetId: parent.datasetId,
      });

      const metadata = datasetsWithWeights?.metadata;

      if (metadata == null) {
        // no weights
        return { hasWeights: false };
      }

      return {
        hasWeights: true,
        lastUpdatedAt: metadata.timestamp,
      };
    },
    monitoredCategories: async (parent, args, context): Promise<AlertCategory[]> =>
      getMonitorCoverageForDataset(context.resolveUserOrgID(), parent.datasetId),
    tracesSummary: async (parent, { fromTimestamp, toTimestamp }, context): Promise<LlmTraces | null> => {
      if (parent.modelType !== ModelType.Llm) {
        return null;
      }
      const callOptions = callOptionsFromGraphqlCxt(context);
      const orgId = context.resolveUserOrgID();
      const resourceId = parent.datasetId;
      const { hasTraceData, maxStartTime } = await context.dataSources.dataService.getTracesDateRange({
        key: { orgId },
        params: { orgId, resourceId },
      });
      const granularity = timePeriodToDataServiceGranularity(parent.batchFrequency);

      const tracesData = await getTracesSummary(
        {
          orgId,
          resourceId,
          interval: getInterval(fromTimestamp, toTimestamp),
          granularity,
        },
        callOptions,
      );

      const formattedContext = formatGraphQLContext(context);
      const counts = tracesData.entries.reduce(
        (acc, entry) => {
          const parsed = parseTraceEntryCounts(entry, formattedContext);
          if (!parsed) return acc;
          return {
            violationsCount: acc.violationsCount + parsed.violationsCount,
            blockedInteractionsCount: acc.blockedInteractionsCount + parsed.blockedInteractionsCount,
            totalCount: acc.totalCount + parsed.total,
          };
        },
        { violationsCount: 0, blockedInteractionsCount: 0, totalCount: 0 },
      );

      return {
        hasTraces: hasTraceData,
        latestTraceTimestamp: maxStartTime,
        ...counts,
      };
    },
  },
  Dataset: DatasetQueryResolvers,
  Feature: FeatureQueryResolvers,
  BatchMetadata: {
    metrics: async (parent): Promise<ModelMetrics> => {
      // metrics are handled in parent when getting other batch metadata
      return parent.metrics;
    },
    sketches: async (parent, args, context): Promise<FilteredFeatureSketches> => {
      const { limit, offset, filter, histogramSplitPoints, excludeEmpty } = args;
      const { datasetId, tags, batchFrequency } = parent;
      return getFilteredSketchesForBatch({
        batchIdentifier: {
          type: 'dataset',
          datasetId,
          tags,
          batchFrequency,
          batchTimestamp: parent.timestamp,
        },
        context,
        limit,
        offset,
        filter,
        histogramSplitPoints,
        excludeEmpty,
      });
    },
  },
  AlertCategoryCounts: {
    totals: getAnomalyCountTotals,
  },
  DataQualityEvent: {
    __resolveType: (parent): 'DataQualityEventBase' | 'ThresholdEvent' | 'DataTypeEvent' => {
      switch (parent.archetype) {
        case EventArchetype.Threshold:
          return 'ThresholdEvent';
        case EventArchetype.DataType:
          return 'DataTypeEvent';
        default:
          return 'DataQualityEventBase';
      }
    },
  },
  EventExplanation: {
    __resolveType: (parent) => parent.__typename ?? 'BaseEventExplanation',
  },
};

export default resolvers as IResolvers;
