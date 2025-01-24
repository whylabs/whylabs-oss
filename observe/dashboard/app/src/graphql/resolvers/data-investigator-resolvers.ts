import { IResolvers } from '@graphql-tools/utils';

import { DataQueryValidationError } from '../../errors/dashbird-error';
import { getLogger } from '../../providers/logger';
import { ModelMetricsByTimestamp } from '../../services/data/data-service/api-wrappers/model-metrics';
import { getSegmentsForKey } from '../../services/data/data-service/api-wrappers/segments';
import { getInterval, tagsToDataServiceSegment } from '../../services/data/data-service/data-service-utils';
import { FeatureSketchesRequest } from '../../services/data/data-service/queries/feature-queries';
import {
  GetMetricRequest,
  validateQueryRequest,
} from '../../services/data/data-service/queries/numeric-metrics-queries';
import { getCustomMetrics } from '../../services/data/datasources/helpers/entity-schema';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { FullGraphQLContext } from '../context';
import {
  FeatureSketch,
  MetricResult,
  MetricRollupResult,
  MetricSchema,
  ModelMetrics,
  ModelMetricsRollup,
  Resolvers,
  TimePeriod,
} from '../generated/graphql';
import {
  extractRequiredMetrics,
  filterMetricsByTags,
  findMetricMetadata,
  getBuiltInMetrics,
} from './helpers/data-metrics';

const logger = getLogger('DataInvestigatorResolversLogger');

const resolvers: Resolvers<FullGraphQLContext> = {
  DataInvestigator: {
    getMetricData: async (parent, args, { dataSources, resolveUserOrgID }): Promise<MetricResult[]> => {
      const { fromTimestamp, toTimestamp, granularity, queries, segment } = args;
      const orgId = resolveUserOrgID();
      validateQueryRequest(args);
      logger.info('Making data investigator queries %s in org %s', JSON.stringify(queries), orgId);
      const req: GetMetricRequest = {
        orgId,
        segmentTags: segment ?? [],
        fromTimestamp,
        toTimestamp,
        granularity: granularity ?? TimePeriod.P1D,
        queries,
      };
      return dataSources.dataService.getNumericMetrics(req);
    },
    getSegmentMetricDataRollup: async (parent, args, context): Promise<MetricRollupResult[]> => {
      const { dataSources, resolveUserOrgID } = context;
      const { fromTimestamp, toTimestamp, queries, segmentKey } = args;
      if (queries.length === 0) {
        return [];
      }
      const orgId = resolveUserOrgID();
      // Really tactical hack... signature should be changed to be for a specific dataset
      if (queries.length > 1) {
        throw new DataQueryValidationError(['Segment rollup is only supported for a single dataset and metric']);
      }
      validateQueryRequest(args);
      const { datasetId, metric, feature } = queries[0];
      logger.info('Making data investigator segment rollup queries %s in org %s', JSON.stringify(queries), orgId);
      // get segments
      const allSegmentValues = await getSegmentsForKey(
        { orgId, resourceId: datasetId, key: segmentKey, tags: [] },
        callOptionsFromGraphqlCxt(context),
      );
      const req = {
        orgId,
        datasetId,
        metric,
        column: feature ?? undefined,
        interval: getInterval(fromTimestamp, toTimestamp),
        segments: allSegmentValues.map((value) => [{ key: segmentKey, value }]),
      };
      return dataSources.dataService.getNumericMetricsSegmentRollup(req);
    },
    getMetricRollupForSegments: async (
      parent,
      args,
      { dataSources, resolveUserOrgID },
    ): Promise<MetricRollupResult[]> => {
      const { fromTimestamp, toTimestamp, datasetId, metric, column, segments } = args;
      const orgId = resolveUserOrgID();
      logger.info('Making rollup query of metric %s dataset %s in org %s for segments', metric, datasetId, orgId);
      // get segments
      const req = {
        orgId,
        datasetId,
        metric,
        column: column ?? undefined,
        interval: getInterval(fromTimestamp, toTimestamp),
        segments,
      };
      return dataSources.dataService.getNumericMetricsSegmentRollup(req);
    },
    availableMetrics: async (parent, args, context): Promise<MetricSchema[]> => {
      const { modelType, datasetId, metricTags } = args;
      const metrics: MetricSchema[] = [];

      // If a datasetId was supplied, look for and add custom metrics, if any
      if (datasetId && modelType) {
        const orgId = context.resolveUserOrgID();
        const schema = await context.dataSources.schema.getDatasetSchema({ orgId, datasetId });
        if (schema) {
          const metadata = await context.dataSources.dataService.getDefaultMetricMetadata(
            {},
            callOptionsFromGraphqlCxt(context),
          );
          const customMetrics = await getCustomMetrics(
            schema,
            orgId,
            datasetId,
            modelType,
            {
              tags: metricTags ?? undefined,
            },
            metadata,
          );
          metrics.push(...customMetrics);
        }
      }

      // add standard metrics, filtered by tag
      metrics.push(...filterMetricsByTags(getBuiltInMetrics(modelType ?? undefined), metricTags ?? []));
      return metrics;
    },

    metricInfo: (parent, args): MetricSchema | null => {
      return args.name ? findMetricMetadata(args.name) : null;
    },

    getMergedFeatureData: async (parent, args, { dataSources, resolveUserOrgID }, info): Promise<FeatureSketch> => {
      const {
        fromTimestamp: fromTime,
        toTimestamp: toTime,
        segment: segmentTags,
        datasetId,
        column,
        splitpoints,
      } = args;
      const orgId = resolveUserOrgID();
      logger.info(
        'Requesting merged profile for column %s, segment %s, dataset %s, in org %s',
        column,
        tagsToDataServiceSegment(segmentTags),
        datasetId,
        orgId,
      );

      const req: FeatureSketchesRequest = {
        key: {
          orgId,
          datasetId,
          fromTime,
          toTime,
          segmentTags,
          histogramSplitPoints: splitpoints ?? undefined,
          timePeriod: TimePeriod.All,
        },
        params: {
          featureName: column,
          metrics: extractRequiredMetrics(info),
        },
      };

      const result = await dataSources.dataService.getProfileRollup(req);
      return result[0];
    },
  },
  ModelMetricsQueries: {
    rollup: async (parent, args, context): Promise<ModelMetricsRollup[]> => {
      const { dataSources, resolveUserOrgID } = context;
      const { fromTimestamp, toTimestamp, datasetId, segment, granularity } = args;
      const orgId = resolveUserOrgID();
      const req = {
        orgId,
        datasetId,
        fromTimestamp,
        toTimestamp,
        segmentTags: segment ?? undefined,
        granularity: granularity ?? TimePeriod.P1D,
      };
      const modelMetrics: ModelMetricsByTimestamp = await dataSources.dataService.getModelMetricsForTimeRange(req);
      return Array.from(modelMetrics.keys()).map((ts) => ({ metrics: modelMetrics.get(ts), timestamp: ts }));
    },
    rollupAll: async (parent, args, context): Promise<ModelMetrics | undefined> => {
      const { dataSources, resolveUserOrgID } = context;
      const { fromTimestamp, toTimestamp, datasetId, segment } = args;
      const orgId = resolveUserOrgID();
      const req = {
        orgId,
        datasetId,
        fromTimestamp,
        toTimestamp,
        segmentTags: segment ?? undefined,
        granularity: TimePeriod.All,
      };
      const modelMetrics: ModelMetricsByTimestamp = await dataSources.dataService.getModelMetricsForTimeRange(req);
      const { value } = modelMetrics.values().next();
      return value;
    },
  },
};

export default resolvers as IResolvers;
