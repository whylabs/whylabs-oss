import { Granularity, ModelMetricsRqst } from '@whylabs/data-service-node-client';

import { modelMetricsToGql } from '../../../../graphql/contract-converters/data-service/model-metrics-converter';
import {
  modelMetadataToModel,
  timePeriodToDataServiceGranularity,
} from '../../../../graphql/contract-converters/songbird/model-converters';
import { MetricValue, ModelMetrics, TimePeriod } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { notNullish } from '../../../../util/misc';
import { mapStringToTimePeriod } from '../../../../util/time-period-utils';
import { DerivedMetric, classificationMetrics, regressionMetrics } from '../../data-service/data-service-types';
import { getModel } from '../../songbird/api-wrappers/resources';
import { dataServiceClient } from '../data-service-client-factory';
import { getInterval, getIntervalWithDuration } from '../data-service-utils';
import {
  GetDerivedMetricsRequestKey,
  GetDerivedMetricsRequestParams,
  GetModelMetricsRequest,
  GetModelMetricsTimeRangeRequest,
  getDerivedMetricsQuery,
  getModelMetricsQuery,
  getModelMetricsTimeRangeQuery,
} from '../queries/model-metrics-queries';

const logger = getLogger('DataServiceModelMetricsLogger');

type ClassificationMetric = (typeof classificationMetrics)[number];
type RegressionMetric = (typeof regressionMetrics)[number];

const isClassificationMetric = (metric: DerivedMetric): metric is ClassificationMetric => {
  const classificationDerivedMetrics: DerivedMetric[] = [...classificationMetrics];
  return classificationDerivedMetrics.includes(metric);
};
const isRegressionMetric = (metric: DerivedMetric): metric is RegressionMetric =>
  ['mean_squared_error', 'mean_absolute_error', 'root_mean_squared_error'].includes(metric);

const isNaNValue = (value: unknown): boolean => {
  if ((typeof value === 'string' && value.toLowerCase() === 'nan') || Number.isNaN(value)) {
    return true;
  }
  return false;
};

/**
 * Fetch performance metrics for an interval
 * @param key
 * @param params
 **/
export const getDerivedMetrics = async (
  key: GetDerivedMetricsRequestKey,
  params: GetDerivedMetricsRequestParams[],
  options?: CallOptions,
): Promise<Map<DerivedMetric, MetricValue[]>> => {
  const resultsMap = new Map<DerivedMetric, MetricValue[]>();
  const addToMap = (m: DerivedMetric, timestamp: number, value: number, lastUploadTimestamp?: number) => {
    const existingValues = resultsMap.get(m) ?? [];
    const metricValue: MetricValue = {
      timestamp: timestamp,
      lastUploadTimestamp,
      value,
    };
    existingValues.push(metricValue);
    resultsMap.set(m, existingValues);
  };
  const rqst = getDerivedMetricsQuery(key);
  const requestedMetrics = params.map((p) => p.metricName);
  const classificationMetrics: ClassificationMetric[] = requestedMetrics.filter((m): m is ClassificationMetric =>
    isClassificationMetric(m),
  );
  const regressionMetrics = requestedMetrics.filter((m): m is RegressionMetric => isRegressionMetric(m));

  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: key.datasetId }, options);
  if (classificationMetrics.length) {
    const { data } = await tryCall(
      () => client.profiles.classificationMetrics(rqst, axiosCallConfig(options)),
      options,
    );
    let foundNan = false;
    for (const row of data) {
      for (const metricName of classificationMetrics) {
        if (isNaNValue(row[metricName])) {
          foundNan = true;
          continue;
        }
        addToMap(metricName, row.timestamp, row[metricName], row.last_upload_ts);
      }
    }
    if (foundNan) {
      logger.error(
        `Found NaN values in classification metrics for ${key.orgId} ${key.datasetId} between ${key.fromTimestamp} and ${key.toTimestamp}`,
      );
    }
  }
  if (regressionMetrics.length) {
    const { data } = await tryCall(() => client.profiles.regressionMetrics(rqst, axiosCallConfig(options)), options);
    let foundNan = false;
    for (const item of data) {
      for (const metricName of regressionMetrics) {
        const metric: number | string | undefined = item[metricName];
        if (isNaNValue(metric)) {
          foundNan = true;
          continue;
        }
        if (notNullish(metric)) {
          addToMap(metricName, item.timestamp, metric, item.last_upload_ts);
        }
      }
    }
    if (foundNan) {
      logger.error(
        `Found NaN values in regression metrics for ${key.orgId} ${key.datasetId} between ${key.fromTimestamp} and ${key.toTimestamp}`,
      );
    }
  }
  return resultsMap;
};

export const getModelMetricsForTimestamp = async (
  req: GetModelMetricsRequest,
  options?: CallOptions,
): Promise<ModelMetrics> => {
  const rqst = getModelMetricsQuery(req);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: req.datasetId }, options);
  const { data } = await tryCall(() => client.profiles.classificationSummary(rqst, axiosCallConfig(options)), options);
  const firstRow = data[0];
  if (!firstRow) return {};

  if (data.length > 1) {
    logger.error(
      'Received more than one dataset metric object in response to data service query. Request was %s',
      JSON.stringify(req),
    );
  }
  return modelMetricsToGql(firstRow);
};

export type ModelMetricsByTimestamp = Map<number, ModelMetrics>;

const internalGetModelMetrics = async (
  rqst: ModelMetricsRqst,
  options?: CallOptions,
): Promise<ModelMetricsByTimestamp> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: rqst.datasetId }, options);
  const { data } = await tryCall(() => client.profiles.classificationSummary(rqst, axiosCallConfig(options)), options);
  return new Map(data.map((m) => [m.timestamp, modelMetricsToGql(m)]));
};

export const getModelMetricsForTimeRange = async (
  req: GetModelMetricsTimeRangeRequest,
  options?: CallOptions,
): Promise<ModelMetricsByTimestamp> => {
  return internalGetModelMetrics(getModelMetricsTimeRangeQuery(req), options);
};

export const filterDerivedMetrics = (
  param: GetDerivedMetricsRequestParams,
  results: Map<DerivedMetric, MetricValue[]> | null,
): MetricValue[] => {
  const { metricName } = param;
  return results?.get(metricName) ?? [];
};

export const getIntervalFromResource = async (
  {
    orgId,
    resourceId,
    fromTimestamp,
    toTimestamp,
  }: {
    orgId: string;
    resourceId: string;
    fromTimestamp: number;
    toTimestamp?: number | null;
  },
  callOptions: CallOptions,
): Promise<string> => {
  callOptions = addToContext({ datasetId: resourceId }, callOptions);
  const resource = await getModel(orgId, resourceId, callOptions);
  const batchFrequency = mapStringToTimePeriod.get(resource?.timePeriod ?? '') ?? TimePeriod.P1D;
  return toTimestamp ? getInterval(fromTimestamp, toTimestamp) : getIntervalWithDuration(fromTimestamp, batchFrequency);
};

export const getGranularityFromResource = async (
  {
    orgId,
    resourceId,
  }: {
    orgId: string;
    resourceId: string;
  },
  callOptions: CallOptions,
): Promise<Granularity> => {
  callOptions = addToContext({ datasetId: resourceId }, callOptions);
  const resourceMetadata = await getModel(orgId, resourceId, callOptions);
  const timePeriod = resourceMetadata
    ? modelMetadataToModel(resourceMetadata).batchFrequency ?? TimePeriod.P1D
    : TimePeriod.P1D;

  return timePeriodToDataServiceGranularity(timePeriod);
};
