import path from 'path';

import { BuiltinProfileMetric } from '@whylabs/data-service-node-client';
import { uniq } from 'lodash';
import { z } from 'zod';

import { modelMetadataToModel } from '../../graphql/contract-converters/songbird/model-converters';
import {
  AnalysisResult,
  AnomalyCount,
  GranularityInclusion,
  SortDirection,
  TimePeriod,
} from '../../graphql/generated/graphql';
import { CUSTOM_METRIC_VALUE_SEPARATOR } from '../../graphql/resolvers/types/metrics';
import { getLogger } from '../../providers/logger';
import { getAnalyzerResults } from '../../services/data/data-service/api-wrappers/analyzer-results';
import { getAnomalyCount } from '../../services/data/data-service/api-wrappers/anomaly-counts';
import { getMetricsTimeseries } from '../../services/data/data-service/api-wrappers/numeric-metrics';
import {
  getInterval,
  getIntervalWithDuration,
  toBuiltinProfileMetric,
  toBuiltinTraceMetric,
  toFormula,
  toFormulaMetric,
  toTraceFormulaBuiltIns,
} from '../../services/data/data-service/data-service-utils';
import {
  BuiltinTraceMetric,
  GetMetricsTimeseriesRequest,
  MetricTimeseriesResult,
  TimeSeriesUnionQuery,
} from '../../services/data/data-service/queries/numeric-metrics-queries';
import { getModel } from '../../services/data/songbird/api-wrappers/resources';
import { CallOptions } from '../../util/async-helpers';
import {
  TimeseriesLlmQuery,
  TimeseriesMonitorQuery,
  TimeseriesProfileQuery,
  TimeseriesQueryUnion,
} from '../dashboard/types/queries';
import { prepareSegmentsToQuery } from '../meta/segments';
import { TrpcContext } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { intervalSchema, orgSchema } from '../util/schemas';
import { ColumnSeries, DataPoint } from './types/simpleMetricsTypes';

/* eslint-disable max-lines */

const logger = getLogger(path.parse(__filename).base);

type GetListReturnType = {
  series: ColumnSeries[];
  timePeriod?: TimePeriod;
};

const commonSchema = orgSchema.merge(intervalSchema);

type CommonType = z.infer<typeof commonSchema>;

type CommonQueryType = CommonType & {
  callOptions: CallOptions;
  interval: string;
  timePeriod: TimePeriod;
};

const getFromMetricString = <T>(metricString: string, mapFn: (val: string) => T): T | null => {
  try {
    const [value] = metricString.split(CUSTOM_METRIC_VALUE_SEPARATOR);
    const metric = mapFn(value);
    return metric ? metric : null;
  } catch (error) {
    logger.error(error, `Error parsing metric:${metricString}`);
    return null;
  }
};

const getProfileMetricFromString = (metricString: string): BuiltinProfileMetric | null => {
  const metric = getFromMetricString(metricString, toBuiltinProfileMetric);
  if (!metric) {
    logger.error(`Invalid profile metric string: ${metricString}`);
    return null;
  }
  return metric;
};

// We should probably replace count and drift monitor metrics with this and getMetricTimeseries
// const getMonitorMetricFromString = (metricString: string): BuiltinMonitorMetric | null => {
//   const metric = getFromMetricString(metricString, toBuiltInMonitorMetric);
//   if (!metric) {
//     logger.error(`Invalid monitor metric string: ${metricString}`);
//     return null;
//   }
//   return metric;
// };

const metricTimeseriesResultToColumnSeries = (result: MetricTimeseriesResult, metric: string): ColumnSeries => {
  return {
    column: result.column ?? '',
    data: result.points,
    metric: result.metric ?? metric,
    queryId: result.queryId,
    resourceId: result.datasetId,
    segment: result.segment ?? [],
    type: 'timeseries',
  };
};

const doSimpleTimeseriesProfilesMetricsQuery = async ({
  callOptions,
  columnName,
  fromTimestamp,
  metric: metricString,
  orgId,
  queryId,
  resourceId,
  segment,
  toTimestamp,
  timePeriod,
}: CommonQueryType & TimeseriesProfileQuery): Promise<ColumnSeries[]> => {
  const metric = getProfileMetricFromString(metricString);
  if (!metric) return [];

  const segmentsToQuery = await prepareSegmentsToQuery({ orgId, resourceId, segment, callOptions });
  const segments = segmentsToQuery.length > 0 ? segmentsToQuery : [[]];
  const queries: TimeSeriesUnionQuery[] = segments.map((segment, index) => ({
    queryId: `${queryId}-${index}`,
    datasource: 'profiles',
    columnName,
    metric,
    resourceId,
    segment,
  }));

  const request: GetMetricsTimeseriesRequest = {
    orgId,
    interval: getInterval(fromTimestamp, toTimestamp),
    granularity: timePeriod ?? TimePeriod.P1D,
    queries,
  };

  const results = await getMetricsTimeseries(request, callOptions);
  // UI expects the results to have the same original query id
  return results.map((r) => ({ ...metricTimeseriesResultToColumnSeries(r, metric), queryId }));
};

const doSimpleTimeseriesLlmMetricsQuery = async ({
  callOptions,
  columnName,
  fromTimestamp,
  metric: metricString,
  orgId,
  queryId,
  resourceId,
  toTimestamp,
  timePeriod,
}: CommonQueryType & TimeseriesLlmQuery): Promise<ColumnSeries[]> => {
  const builtInMetric = getFromMetricString(metricString, toBuiltinTraceMetric);
  const granularity = timePeriod ?? TimePeriod.P1D;
  const interval = getInterval(fromTimestamp, toTimestamp);
  if (builtInMetric) {
    const request: GetMetricsTimeseriesRequest = {
      orgId,
      interval,
      granularity,
      queries: [
        {
          queryId,
          datasource: 'traces',
          columnName,
          metric: builtInMetric,
          resourceId,
        },
      ],
    };

    const results = await getMetricsTimeseries(request, callOptions);
    return results.map((result) => metricTimeseriesResultToColumnSeries(result, builtInMetric));
  }

  // It's not built-in metric, do we know its formula?
  const formulaMetric = getFromMetricString(metricString, toFormulaMetric) ?? undefined;
  if (!formulaMetric) {
    logger.error(`Invalid trace metric string: ${metricString}`);
    return [];
  }
  // look up the formula and the built-in metrics we need to query to enable it
  // Note: the formula relies on the metric names being used as the queryIds in the request
  const formula = toFormula(formulaMetric);
  const formulaBuiltIns: BuiltinTraceMetric[] = toTraceFormulaBuiltIns(formulaMetric) ?? [];

  const request: GetMetricsTimeseriesRequest = {
    orgId,
    interval,
    granularity,
    queries: uniq(formulaBuiltIns).map((metric) => ({
      queryId: metric, // this must be the metric name for formula to work
      datasource: 'traces',
      columnName,
      metric,
      resourceId,
    })),
    formulas: [{ queryId, formula, resourceId }],
  };

  const results = await getMetricsTimeseries(request, callOptions);
  // Return only the formula result, which has the specified queryId
  return results
    .filter((res) => res.queryId == queryId)
    .map((result) => metricTimeseriesResultToColumnSeries(result, formulaMetric));
};

const doSimpleTimeseriesAnomalyCountMonitorMetricsQuery = async ({
  callOptions,
  interval,
  metric,
  orgId,
  queryId,
  resourceId,
  timePeriod,
  segment,
}: CommonQueryType & TimeseriesMonitorQuery): Promise<ColumnSeries[]> => {
  try {
    const segmentsToQuery = await prepareSegmentsToQuery({ orgId, resourceId, segment, callOptions });

    const commonProps = {
      datasetID: resourceId,
      granularityInclusion: GranularityInclusion.RollupOnly,
      interval,
      monitorIDs: [metric],
      orgId,
      timePeriod,
    };

    const promises: Promise<AnomalyCount[]>[] = [];
    if (segmentsToQuery.length > 0) {
      segmentsToQuery.forEach((segmentTags) => {
        promises.push(getAnomalyCount({ ...commonProps, segmentTags }, callOptions));
      });
    } else {
      // If no segments are selected, we should fetch the data without any segment tags
      promises.push(getAnomalyCount({ ...commonProps, segmentTags: [] }, callOptions));
    }

    const waitedResults = await Promise.allSettled(promises);
    const metricResults: ColumnSeries[] = [];

    waitedResults.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        const data = res.value.map(({ anomalyCount, timestamp }) => ({ timestamp, value: anomalyCount }));
        metricResults.push({
          column: 'anomaly',
          data,
          metric,
          queryId,
          resourceId,
          segment: segmentsToQuery[index],
          type: 'timeseries',
        });
      } else {
        // TODO: surface to frontend? TBD
        logger.error(res, 'Error fetching anomaly count metrics');
      }
    });

    return metricResults;
  } catch (error) {
    logger.error(error, 'Error fetching anomaly count metrics');
  }

  return [];
};

const doSimpleTimeseriesAnalyzerMonitorMetricsQuery = async ({
  callOptions,
  columnName,
  interval,
  metric,
  metricField,
  orgId,
  queryId,
  resourceId,
  segment,
}: CommonQueryType & TimeseriesMonitorQuery): Promise<ColumnSeries[]> => {
  // We don't want to fetch it without a selected column and metric field
  if (!columnName || !metricField) return [];

  try {
    const segmentsToQuery = await prepareSegmentsToQuery({ orgId, resourceId, segment, callOptions });

    const commonProps = {
      anomaliesOnly: false,
      columns: new Set([columnName]),
      datasetIds: new Set([resourceId]),
      granularityInclusion: GranularityInclusion.RollupOnly,
      includeFailed: false,
      interval,
      monitorIDs: new Set([metric]),
      limit: 1000,
      offset: 0,
      orgId,
      sortDirection: SortDirection.Asc,
    };

    const promises: Promise<AnalysisResult[]>[] = [];
    if (segmentsToQuery.length > 0) {
      segmentsToQuery.forEach((segmentTags) => {
        promises.push(getAnalyzerResults({ ...commonProps, segmentTags }, callOptions));
      });
    } else {
      // If no segments are selected, we should fetch the data without any segment tags
      promises.push(getAnalyzerResults({ ...commonProps, segmentTags: [] }, callOptions));
    }

    const waitedResults = await Promise.allSettled(promises);
    const metricResults: ColumnSeries[] = [];
    waitedResults.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        const data: DataPoint[] = [];

        res.value.forEach((analyzerResult) => {
          if (analyzerResult.datasetTimestamp) {
            data.push({
              timestamp: analyzerResult.datasetTimestamp,
              // @ts-expect-error - TS doesn't know that analyzerResult[metricField] can exists and we need it to be variable
              value: analyzerResult[metricField],
            });
          } else {
            logger.warn('Missing datasetTimestamp in analyzer result', analyzerResult);
          }
        });

        metricResults.push({
          column: columnName,
          data,
          metric,
          queryId,
          resourceId,
          segment: segmentsToQuery[index],
          type: 'timeseries',
        });
      } else {
        // TODO: surface to frontend? TBD
        logger.error(res, 'Error fetching analyzer results metrics');
      }
    });

    return metricResults;
  } catch (error) {
    logger.error(error, 'Error fetching analyzer results metrics');
  }

  return [];
};

const doSimpleTimeseriesMonitorMetricsQuery = async ({
  metric,
  ...rest
}: CommonQueryType & TimeseriesMonitorQuery): Promise<ColumnSeries[]> => {
  if (!metric) return [];
  const [value, type] = metric.split('.');

  if (type === 'anomaly') {
    return doSimpleTimeseriesAnomalyCountMonitorMetricsQuery({
      ...rest,
      metric: value,
    });
  }

  return doSimpleTimeseriesAnalyzerMonitorMetricsQuery({
    ...rest,
    metric: value,
  });
};

export const doSimpleTimeseriesMetricsQuery = async (
  props: CommonType & TimeseriesQueryUnion,
  ctx: TrpcContext,
): Promise<GetListReturnType> => {
  const callOptions = callOptionsFromTrpcContext(ctx);

  const resourceMetadata = await getModel(props.orgId, props.resourceId, callOptions);
  if (!resourceMetadata) return { series: [] };

  const resource = modelMetadataToModel(resourceMetadata);
  const timePeriod = resource?.batchFrequency ?? TimePeriod.P1D;
  const interval = props.toTimestamp
    ? getInterval(props.fromTimestamp, props.toTimestamp)
    : getIntervalWithDuration(props.fromTimestamp, timePeriod);

  const commonProps = {
    callOptions,
    interval,
    timePeriod,
  };

  if (props.source === 'Profiles') {
    const series = await doSimpleTimeseriesProfilesMetricsQuery({
      ...props,
      ...commonProps,
    });

    return { series, timePeriod };
  }

  if (props.source === 'LLM') {
    const series = await doSimpleTimeseriesLlmMetricsQuery({
      ...props,
      ...commonProps,
    });

    return { series, timePeriod };
  }

  if (props.source === 'Monitors') {
    const series = await doSimpleTimeseriesMonitorMetricsQuery({
      ...props,
      ...commonProps,
    });
    return { series, timePeriod };
  }

  logger.error(props, 'Unhandled source found in simple timeseries metrics query');
  return { series: [], timePeriod };
};
