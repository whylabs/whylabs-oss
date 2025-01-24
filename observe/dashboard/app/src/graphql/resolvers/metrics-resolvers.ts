import { IResolvers } from '@graphql-tools/utils';

import { GenericDashbirdError } from '../../errors/dashbird-error';
import { DerivedMetric, isDataServiceDerivedMetric } from '../../services/data/data-service/data-service-types';
import { FeatureSketchesRequest } from '../../services/data/data-service/queries/feature-queries';
import { GetBatchableMetricRequest } from '../../services/data/data-service/queries/numeric-metrics-queries';
import { MetricInfo } from '../../services/data/datasources/helpers/entity-schema';
import { FullGraphQLContext } from '../context';
import {
  isSupportedDistributionMetric,
  isSupportedNumericMetric,
} from '../contract-converters/data-service/numeric-metrics-converter';
import { AnalysisMetric, DistributionValue, MetricQuery, MetricValue, Resolvers } from '../generated/graphql';

const getDerivedMetric = async (
  derivedMetric: DerivedMetric,
  metricInfo: MetricInfo,
  fromTimestamp: number,
  toTimestamp: number | null, // if null, return single batch
  context: FullGraphQLContext,
): Promise<MetricValue[]> => {
  const orgId = context.resolveUserOrgID();
  const { datasetId, segmentTags, datasetGranularity } = metricInfo;
  const req = {
    key: {
      orgId,
      datasetId,
      segmentTags,
      granularity: datasetGranularity,
      fromTimestamp: fromTimestamp,
      toTimestamp: toTimestamp,
    },
    params: {
      metricName: derivedMetric,
    },
  };
  return context.dataSources.dataService.getDerivedModelMetrics(req);
};

const getCustomNumericMetric = async (
  metricInfo: MetricInfo,
  fromTimestamp: number,
  toTimestamp: number | null, // if null, return single batch
  context: FullGraphQLContext,
): Promise<MetricValue[]> => {
  const orgId = context.resolveUserOrgID();
  const { name, datasetId, segmentTags, datasetGranularity, metadata } = metricInfo;

  // if the requested metric is not on the list of known derived metrics, treat it as a custom metric
  const query: MetricQuery = {
    datasetId,
    metric: metadata?.queryDefinition?.metric ?? AnalysisMetric.Unknown,
    feature: metadata?.queryDefinition?.column ?? name,
  };
  const req: GetBatchableMetricRequest = {
    key: { orgId, fromTimestamp, toTimestamp, granularity: datasetGranularity, segmentTags },
    params: { queries: [query] },
  };
  const result = await context.dataSources.dataService.getBatchableNumericMetrics(req);
  return result
    .flatMap((r) => r.points)
    .map((r) => ({ timestamp: r.timestamp, value: r.value, lastUploadTimestamp: r.lastUploadTimestamp }));
};

const getCustomDistributionMetrics = async (
  metricInfo: MetricInfo,
  fromTimestamp: number,
  toTimestamp: number | null, // if null, return single batch
  context: FullGraphQLContext,
): Promise<DistributionValue[]> => {
  const orgId = context.resolveUserOrgID();
  const { datasetId, segmentTags, datasetGranularity, metadata } = metricInfo;

  if (!metadata?.queryDefinition?.column) {
    throw new GenericDashbirdError(
      `Unexpected custom metric query with no query column for org ${orgId} dataset ${datasetId}`,
    );
  }

  // Do not return distribution values unless specifically asked for it
  if (!isSupportedDistributionMetric(metadata?.queryDefinition.metric)) {
    return [];
  }

  const req: FeatureSketchesRequest = {
    key: {
      orgId,
      datasetId,
      fromTime: fromTimestamp,
      toTime: toTimestamp,
      segmentTags,
      timePeriod: datasetGranularity,
    },
    params: {
      featureName: metadata.queryDefinition.column,
      metrics: [metadata.queryDefinition.metric],
    },
  };

  const sketches = await context.dataSources.dataService.getProfileRollup(req);
  return sketches.map((sketch) => ({
    timestamp: sketch.datasetTimestamp ?? sketch.createdAt,
    lastUploadTimestamp: sketch.lastUploadTimestamp,
    frequentItems: sketch.frequentItems,
    histogram: sketch.numberSummary,
  }));
};

const getMaybeNumericMetrics = async (
  metricInfo: MetricInfo,
  fromTimestamp: number,
  toTimestamp: number | null, // if null, return single batch
  context: FullGraphQLContext,
): Promise<MetricValue[] | null> => {
  const { name: metricName } = metricInfo;
  // if the requested metric is not on the list of known derived metrics, treat it as a custom metric
  if (!isDataServiceDerivedMetric(metricName)) {
    if (metricInfo.metadata?.queryDefinition && isSupportedNumericMetric(metricInfo.metadata?.queryDefinition.metric)) {
      return getCustomNumericMetric(metricInfo, fromTimestamp, toTimestamp, context);
    } else {
      return null;
    }
  }
  return getDerivedMetric(metricName, metricInfo, fromTimestamp, toTimestamp, context);
};

const resolvers: Resolvers<FullGraphQLContext> = {
  Metric: {
    values: async (parent, { fromTimestamp, toTimestamp: maybeTo }, context): Promise<MetricValue[]> => {
      const toTimestamp = maybeTo ?? context.requestTime;
      const { name: metricName, datasetId } = parent;
      const metrics = await getMaybeNumericMetrics(parent, fromTimestamp, toTimestamp, context);
      if (!metrics) {
        const orgId = context.resolveUserOrgID();
        throw new GenericDashbirdError(
          `Unexpected metric ${metricName} in numeric metric query for org ${orgId} dataset ${datasetId}`,
        );
      }
      return metrics;
    },
  },
  CustomMetric: {
    numericValues: async (parent, { fromTimestamp, toTimestamp: maybeTo }, context): Promise<MetricValue[]> => {
      const toTimestamp = maybeTo ?? context.requestTime;
      return (await getMaybeNumericMetrics(parent, fromTimestamp, toTimestamp, context)) ?? [];
    },
    numericValuesForBatch: async (parent, { timestamp }, context): Promise<MetricValue[]> => {
      return (await getMaybeNumericMetrics(parent, timestamp, null, context)) ?? [];
    },
    distributionValues: async (
      parent,
      { fromTimestamp, toTimestamp: maybeTo },
      context,
    ): Promise<DistributionValue[]> => {
      const toTimestamp = maybeTo ?? context.requestTime;
      return getCustomDistributionMetrics(parent, fromTimestamp, toTimestamp, context);
    },
    distributionValuesForBatch: async (parent, { timestamp }, context): Promise<DistributionValue[]> => {
      return getCustomDistributionMetrics(parent, timestamp, null, context);
    },
  },
};

export default resolvers as IResolvers;
