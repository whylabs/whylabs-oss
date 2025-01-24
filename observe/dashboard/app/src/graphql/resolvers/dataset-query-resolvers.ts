import { PERFORMANCE_TAG } from '../../constants';
import { getProfileInsights } from '../../services/data/data-service/api-wrappers/insights';
import { DataAvailabilityRequest } from '../../services/data/data-service/api-wrappers/time-boundary';
import { GetLatestAnomalyRequest } from '../../services/data/data-service/queries/analysis-queries';
import { getMetricInfo, getNumericOrDistributionMetrics } from '../../services/data/datasources/helpers/entity-schema';
import { getConstraints } from '../../services/data/songbird/api-wrappers/monitor-config';
import { listReferenceProfiles } from '../../services/data/songbird/api-wrappers/profiles';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { pageArray } from '../../util/misc';
import { isNumber } from '../../util/type-guards';
import { validatePaginationLimit } from '../../util/validation';
import { FullGraphQLContext } from '../context';
import { assetTypeToClass } from '../contract-converters/songbird/model-converters';
import { contractRefProfileToGQL } from '../contract-converters/songbird/reference-profile-converter';
import {
  AnalysisResult,
  BatchMetadata,
  CustomMetric,
  DataAvailability,
  DataLineage,
  DatasetResolvers,
  DateRange,
  EntitySchema,
  Feature,
  FeatureCounts,
  FilteredFeatures,
  IndividualProfile,
  IndividualProfileItem,
  InsightEntry,
  Metric,
} from '../generated/graphql';
import { getFilteredAnalysisResults } from './helpers/analysis-results';
import { getAnomalyCountsByCategory, getAnomalyCountsForDataset } from './helpers/anomaly-counts';
import {
  getBatchDateRange,
  getBatchMetadataByTimestamp,
  shouldFetchInputOutputCounts,
  shouldFetchMetrics,
} from './helpers/batch-metadata';
import { getCustomMetricsByTag } from './helpers/custom-metrics';
import { getBaselineForDataset, getSchemaForDataset } from './helpers/dataset';
import { getFilteredColumns } from './helpers/filtered-columns';

export const DatasetQueryResolvers: DatasetResolvers<FullGraphQLContext> = {
  __resolveType: (parent) => (parent.tags.length > 0 ? 'Segment' : 'Model'),
  assetCategory: (parent) => assetTypeToClass(parent.modelType),
  dataAvailability: async (parent, args, context): Promise<DataAvailability | null> => {
    const orgId = context.resolveUserOrgID();
    const { datasetId, tags } = parent;

    const req: DataAvailabilityRequest = {
      key: { orgId, tags, timePeriod: parent.batchFrequency },
      params: { datasetId },
    };

    return context.dataSources.dataService.getDataAvailability(req);
  },
  dataLineage: async (parent, args, context): Promise<DataLineage | null> => {
    const orgId = context.resolveUserOrgID();
    const { datasetId, tags } = parent;

    const req: DataAvailabilityRequest = {
      key: { orgId, tags, timePeriod: parent.batchFrequency },
      params: { datasetId },
    };

    const dataAvailability = await context.dataSources.dataService.getDataAvailability(req);
    const timestamps = [dataAvailability?.oldestTimestamp, dataAvailability?.latestTimestamp].filter(isNumber);

    const batches = await Promise.all(timestamps.map((ts) => getBatchDateRange(parent, context, ts)));
    const [oldestRange, latestRange] = batches;
    if (!oldestRange || !latestRange) return null;
    return {
      oldestProfileTimestamp: oldestRange.fromTimestamp,
      latestProfileTimestamp: latestRange.fromTimestamp,
    };
  },
  entitySchema: async (parent, args, context): Promise<EntitySchema | null> => {
    return getSchemaForDataset(parent, context);
  },
  feature: async (parent, args, context): Promise<Feature | null> => {
    const { features } = await getBaselineForDataset(parent, context);
    return features.find((f) => f.name === args.name) ?? null;
  },
  features: async (parent, { limit, offset }, context): Promise<Feature[]> => {
    const { features } = await getBaselineForDataset(parent, context);
    validatePaginationLimit(limit);
    return pageArray(features, offset, limit);
  },
  filteredFeatures: async (parent, args, context): Promise<FilteredFeatures> => {
    const { offset, sort, filter, limit } = args;
    validatePaginationLimit(limit);

    const { features } = await getBaselineForDataset(parent, context);
    const filteredFeatures = await getFilteredColumns(parent, features, context, filter, sort ?? undefined);

    return {
      results: pageArray(filteredFeatures, offset, limit),
      totalCount: filteredFeatures.length,
    };
  },
  output: async (parent, { name }, context): Promise<Feature | null> => {
    const { outputs } = await getBaselineForDataset(parent, context);
    if (name) {
      return outputs.find((output) => output.name === name) ?? null;
    }

    return outputs.slice().shift() ?? null;
  },
  outputs: async (parent, args, context): Promise<Feature[]> => {
    const { outputs } = await getBaselineForDataset(parent, context);
    return outputs;
  },
  filteredOutputs: async (parent, args, context): Promise<FilteredFeatures> => {
    const { offset, sort, filter, limit } = args;
    validatePaginationLimit(limit);

    const { outputs } = await getBaselineForDataset(parent, context);
    const filteredOutputs = await getFilteredColumns(parent, outputs, context, filter, sort ?? undefined, false);

    return {
      results: pageArray(filteredOutputs, offset, limit),
      totalCount: filteredOutputs.length,
    };
  },
  datasetMetric: async (parent, args, context): Promise<Metric | null> => {
    const customMetrics = await getCustomMetricsByTag(parent.modelType, parent.datasetId, context, [PERFORMANCE_TAG]);
    const datasetMetrics = getMetricInfo(parent, customMetrics);
    const metric = datasetMetrics.find((m) => m.name === args.name);
    if (!metric) return null;

    // values will be resolved in Metric resolver
    return { ...metric, datasetGranularity: args.granularity ?? parent.batchFrequency, values: [] };
  },
  datasetMetrics: async (parent, args, context): Promise<Metric[]> => {
    const customMetrics = await getCustomMetricsByTag(parent.modelType, parent.datasetId, context, [PERFORMANCE_TAG]);
    // values will be resolved in Metric resolver
    const metrics = getMetricInfo(parent, customMetrics).map((metric) => ({
      ...metric,
      datasetGranularity: args.granularity ?? parent.batchFrequency,
      values: [],
    }));
    return metrics;
  },
  customMetrics: async (parent, args, context): Promise<CustomMetric[]> => {
    const customMetrics = await getCustomMetricsByTag(parent.modelType, parent.datasetId, context, args.tags ?? []);
    return getNumericOrDistributionMetrics(parent, customMetrics, args.granularity ?? parent.batchFrequency);
  },
  batch: async (parent, { datasetTimestamp }, context, info): Promise<BatchMetadata | null> =>
    getBatchMetadataByTimestamp(parent, context, datasetTimestamp, info),
  batches: async (parent, args, context, info): Promise<BatchMetadata[]> => {
    const { from: fromTimestamp, to, timestamps } = args;
    const { datasetId, tags } = parent;
    const { dataSources } = context;
    const toTimestamp = to ?? context.requestTime;
    const includeInputOutputCounts = shouldFetchInputOutputCounts(info);
    const includeMetrics = shouldFetchMetrics(info);
    const { outputs } = includeInputOutputCounts ? await getBaselineForDataset(parent, context) : { outputs: [] };
    if (timestamps == null) {
      const orgId = await context.resolveUserOrgID();
      const req = {
        orgId,
        datasetId: datasetId,
        segmentTags: tags,
        includeInputOutputCounts,
        outputFeatureNames: outputs.map((o) => o.name),
        fromTime: fromTimestamp,
        toTime: toTimestamp,
        timePeriod: parent.batchFrequency,
      };
      const options = callOptionsFromGraphqlCxt(context);
      const metadata = await (parent.tags?.length > 0
        ? dataSources.dataService.getSegmentedMetadataForTimeRange({
            key: {
              orgId,
              datasetId,
              includeInputOutputCounts,
              fromTime: req.fromTime,
              toTime: req.toTime,
              timePeriod: req.timePeriod,
            },
            params: { segmentTags: req.segmentTags, outputFeatureNames: req.outputFeatureNames },
          })
        : dataSources.dataService.getBatchMetadataForTimeRange(req, options));
      if (includeMetrics) {
        const metricsByTimestamp = await context.dataSources.dataService.getModelMetricsForTimeRange({
          orgId,
          datasetId: parent.datasetId,
          segmentTags: parent.tags,
          fromTimestamp,
          toTimestamp,
          granularity: parent.batchFrequency,
        });
        metadata.forEach((m) => {
          m.metrics = metricsByTimestamp.get(m.timestamp) ?? {};
        });
      }
      return metadata;
    }

    // if timestamps arg was specified, fetch all the batches related to those timestamps, instead of querying by time range
    const batches = await Promise.all(
      timestamps.map((timestamp) => getBatchMetadataByTimestamp(parent, context, timestamp, info)),
    );
    return batches.reduce((res, batch) => (batch ? res.concat(batch) : res), [] as BatchMetadata[]);
  },
  batchDateRanges: async (parent, { timestamps }, context): Promise<DateRange[]> => {
    const ranges = await Promise.all(timestamps.map((timestamp) => getBatchDateRange(parent, context, timestamp)));
    return ranges.reduce((res, range) => (range ? res.concat(range) : res), [] as DateRange[]);
  },
  latestAnomalyTimestamp: async (parent, args, context): Promise<number | null> => {
    const req: GetLatestAnomalyRequest = {
      key: {
        orgId: context.resolveUserOrgID(),
        tags: parent.tags,
        requestTime: context.requestTime,
        column: null,
        analyzerIDs: args.analyzerIds ?? null,
        monitorIDs: args.monitorIds ?? null,
      },
      params: { datasetId: parent.datasetId },
    };

    return context.dataSources.dataService.getLatestAnomaly(req);
  },
  alertCountsV2: ({ datasetId, tags, batchFrequency }, args, context) =>
    getAnomalyCountsForDataset(datasetId, tags, batchFrequency, args, context),
  referenceProfiles: async (parent, { profileIds }, context) => {
    if (profileIds?.length === 0) return []; // commonly called with an empty list so this is important shortcut!

    // Deliberately ignoring from/to as ui is calling with date range but not intending to filter ref profiles - fix in ui at some point
    const staticProfiles = (
      await listReferenceProfiles(
        context.resolveUserOrgID(),
        parent.datasetId,
        undefined,
        undefined,
        callOptionsFromGraphqlCxt(context),
      )
    ).map((p) => contractRefProfileToGQL(p, parent.tags)); // TODO: We are still fetching all profiles, idealy if we have profileIds param we only want to fetch those provided profiles.

    // If list of profileIds is specified return only that list of profiles
    if (profileIds) return staticProfiles.filter((profile) => profileIds.includes(profile.id));

    return staticProfiles;
  },
  individualProfileList: async (
    parent,
    { from, to, limit, offset },
    { resolveUserOrgID, dataSources },
  ): Promise<IndividualProfileItem[]> => {
    return dataSources.dataService.listIndividualProfiles({
      orgId: resolveUserOrgID(),
      datasetId: parent.datasetId,
      fromTimestamp: from,
      toTimestamp: to,
      segmentTags: parent.tags,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
  },
  individualProfiles: async (parent, { retrievalTokens }): Promise<IndividualProfile[]> =>
    retrievalTokens.map((retrievalToken) => ({
      datasetId: parent.datasetId,
      retrievalToken,
      sketch: null,
    })),
  constraintsList: async (parent, _, context): Promise<string[] | null> => {
    return getConstraints(context.resolveUserOrgID(), parent.datasetId, callOptionsFromGraphqlCxt(context));
  },
  featureCounts: async (parent, args, context): Promise<FeatureCounts> => {
    const { features } = await getBaselineForDataset(parent, context);
    const discreteCount = features.reduce((count, f) => {
      return f.schema?.isDiscrete ? ++count : count;
    }, 0);

    const nonDiscreteCount = features.length - discreteCount;

    return {
      discrete: discreteCount,
      nonDiscrete: nonDiscreteCount,
    };
  },
  insights: async (parent, args, context): Promise<InsightEntry[] | null> =>
    getProfileInsights(
      {
        resourceId: parent.datasetId,
        orgId: context.resolveUserOrgID(),
        granularity: parent.batchFrequency,
        segment: args.tags ?? [],
        batchProfileTimestamp: args.batchProfileTimestamp ?? null,
        referenceProfileId: args.referenceProfileId ?? null,
      },
      callOptionsFromGraphqlCxt(context),
    ),
  analysisResults: async (parent, args, context): Promise<AnalysisResult[] | null> =>
    getFilteredAnalysisResults(
      {
        ...args.filter,
        datasetId: parent.datasetId,
        segmentTags: parent.tags,
      },
      args.sortDirection,
      context,
    ),
  anomalies: async (parent, args, context): Promise<AnalysisResult[] | null> =>
    getFilteredAnalysisResults(
      {
        ...args.filter,
        anomaliesOnly: true,
        datasetId: parent.datasetId,
        segmentTags: parent.tags,
      },
      args.sortDirection,
      context,
    ),
  anomalyCounts: ({ datasetId, tags, batchFrequency }, args, context) =>
    getAnomalyCountsByCategory(datasetId, tags, batchFrequency, args, context),
};
