import path from 'path';

import { z } from 'zod';

import { DataQueryValidationError } from '../../errors/dashbird-error';
import { contractAssetTypeToGQL, parseModelType } from '../../graphql/contract-converters/songbird/model-converters';
import {
  AnalysisTargetLevel,
  MetricRollupResult,
  MetricSchema,
  MetricSource,
  ModelType,
} from '../../graphql/generated/graphql';
import { getBuiltInMetrics } from '../../graphql/resolvers/helpers/data-metrics';
import { getMonitorMetricsFromMonitorConfig } from '../../graphql/resolvers/helpers/monitor-utils';
import {
  CUSTOM_METRIC_VALUE_SEPARATOR,
  LlmMetric,
  MetricTypeUnion,
  MonitorMetric,
  ProfileMetric,
} from '../../graphql/resolvers/types/metrics';
import { getLogger } from '../../providers/logger';
import { getDefaultMetricMetadata } from '../../services/data/data-service/api-wrappers/metric-metadata';
import {
  getNumericMetrics,
  getNumericMetricsSegmentRollup,
} from '../../services/data/data-service/api-wrappers/numeric-metrics';
import { getSegmentsForKey } from '../../services/data/data-service/api-wrappers/segments';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import {
  GetMetricRequest,
  GetMetricRollupRequest,
  validateQueryRequest,
} from '../../services/data/data-service/queries/numeric-metrics-queries';
import { getCustomMetrics } from '../../services/data/datasources/helpers/entity-schema';
import { getSchemaForResource } from '../../services/data/songbird/api-wrappers/entity-schema';
import { getMonitorConfigV3 } from '../../services/data/songbird/api-wrappers/monitor-config';
import { getModel } from '../../services/data/songbird/api-wrappers/resources';
import { CallOptions } from '../../util/async-helpers';
import { TrpcContext, router, viewResourceDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { requiredOrgAndResourceSchema } from '../util/schemas';

const logger = getLogger(path.parse(__filename).name);

const mapMetricSelectGroup = new Map<AnalysisTargetLevel, string>([
  [AnalysisTargetLevel.Column, 'COLUMN METRICS'],
  [AnalysisTargetLevel.Dataset, 'DATASET'],
]);

type GetMetricsQueryType = {
  callOptions: CallOptions;
  input: z.infer<typeof requiredOrgAndResourceSchema>;
  resourceType: ModelType;
  includeLlmMetrics?: boolean;
};

const getResourceType = async ({
  callOptions,
  orgId,
  resourceId,
}: {
  callOptions: CallOptions;
  orgId: string;
  resourceId: string;
}): Promise<ModelType> => {
  const resource = await getModel(orgId, resourceId, callOptions);
  return contractAssetTypeToGQL(parseModelType(resource?.modelType ?? ModelType.Unknown));
};

const getDatasetMetrics = async ({
  callOptions,
  input: { orgId, resourceId },
  resourceType,
  includeLlmMetrics,
}: GetMetricsQueryType): Promise<MetricSchema[]> => {
  const schema = await getSchemaForResource(orgId, resourceId, callOptions);

  const metadata = includeLlmMetrics ? await getDefaultMetricMetadata({}, callOptions) : undefined;
  // Note... DefaultSchemaMetadata must be passed into getCustomMetrics if LLM metrics are to be included
  const customMetrics = await getCustomMetrics(schema, orgId, resourceId, resourceType, undefined, metadata);
  return customMetrics.concat(getBuiltInMetrics(resourceType ?? undefined));
};

const getAllLlmMetrics = async ({ resourceType }: GetMetricsQueryType): Promise<LlmMetric[]> => {
  // LLM metrics are only available for LLM resources
  if (resourceType !== ModelType.Llm) return [];

  const createLlmMetric = ({ label, value }: { label: string; value: string }): LlmMetric => ({
    disableColumn: true,
    disableSegments: true,
    group: 'LLM Secure metrics',
    label,
    source: 'LLM',
    value,
  });

  return [
    createLlmMetric({
      label: 'Policy violations',
      value: 'total_policy_issues',
    }),
    createLlmMetric({
      label: 'Total traces',
      value: 'count_traces',
    }),
    createLlmMetric({
      label: 'Flagged traces',
      value: 'flagged_traces',
    }),
    createLlmMetric({
      label: 'Blocked traces',
      value: 'total_blocked',
    }),
    createLlmMetric({
      label: 'Total tokens',
      value: 'total_tokens',
    }),
    createLlmMetric({
      label: 'Avg. tokens',
      value: 'avg_tokens',
    }),
    createLlmMetric({
      label: 'Total latency',
      value: 'total_latency_millis',
    }),
    createLlmMetric({
      label: 'Avg. latency',
      value: 'avg_latency_millis',
    }),
  ];
};

const getAllProfileMetrics = async ({
  callOptions,
  input,
  resourceType,
}: GetMetricsQueryType): Promise<ProfileMetric[]> => {
  const metrics = await getDatasetMetrics({ callOptions, input, resourceType });

  const response: ProfileMetric[] = [];
  metrics.forEach(
    ({ queryDefinition, label, metricDirection, source, tags, dataType, unitInterval, showAsPercent }) => {
      // Filter out metrics that don't have a query definition
      if (!queryDefinition) return;

      const { column, metric, targetLevel } = queryDefinition;

      const isCustomPerformance = source === MetricSource.UserDefined && tags?.includes('performance');
      const isDatasetTarget = isCustomPerformance || targetLevel === AnalysisTargetLevel.Dataset;
      const hasFixedColumn = !!column;
      const group =
        mapMetricSelectGroup.get(isDatasetTarget ? AnalysisTargetLevel.Dataset : targetLevel) ?? targetLevel;
      response.push({
        disableColumn: isDatasetTarget || hasFixedColumn,
        fixedColumn: column,
        group,
        label,
        source: 'Profiles',
        metricDirection,
        targetLevel,
        value: metric.concat(column ? `${CUSTOM_METRIC_VALUE_SEPARATOR}${column}` : ''),
        queryDefinition,
        dataType,
        unitInterval,
        showAsPercent,
      });
    },
  );

  return response;
};

const getAllMonitorMetrics = async ({
  callOptions,
  input: { orgId, resourceId },
}: GetMetricsQueryType): Promise<MonitorMetric[]> => {
  const monitorConfig = await getMonitorConfigV3(orgId, resourceId, false, false, callOptions);

  return getMonitorMetricsFromMonitorConfig(monitorConfig);
};

const getAllMetrics = async (
  props: GetMetricsQueryType & { skipMonitorMetrics?: boolean | null; skipLlmSecureMetrics?: boolean | null },
): Promise<Array<MetricTypeUnion>> => {
  const { skipLlmSecureMetrics, skipMonitorMetrics } = props;
  const allLlmMetrics = skipLlmSecureMetrics ? [] : await getAllLlmMetrics(props);
  const allProfileMetrics = await getAllProfileMetrics(props);
  const allMonitorMetrics = skipMonitorMetrics ? [] : await getAllMonitorMetrics(props);

  return [...allLlmMetrics, ...allProfileMetrics, ...allMonitorMetrics];
};

type RollUpMetricDataInputType = Omit<GetMetricRequest, 'toTimestamp'> & {
  toTimestamp: number;
};

type SegmentRollUpMetricInputType = Pick<GetMetricRequest, 'queries' | 'fromTimestamp' | 'orgId'> & {
  segmentKey: string;
  toTimestamp: number;
};
const getSegmentRollUpMetricData = async ({
  input,
  ctx,
}: {
  ctx: TrpcContext;
  input: SegmentRollUpMetricInputType;
}): Promise<MetricRollupResult[]> => {
  const { queries } = input;
  if (!queries.length) {
    return [];
  }
  validateQueryRequest(input);
  const { datasetId } = queries[0];
  if (queries.find(({ datasetId: qDatasetId }) => qDatasetId !== datasetId)) {
    throw new DataQueryValidationError(['Segment rollup is only supported for a single dataset at time']);
  }
  const { fromTimestamp, toTimestamp, orgId, segmentKey } = input;
  logger.info('Making data investigator segment rollup queries %s in org %s', JSON.stringify(queries), orgId);

  const callOptions = callOptionsFromTrpcContext(ctx);

  // get segments
  const allSegmentValues = await getSegmentsForKey(
    { orgId, resourceId: datasetId, key: segmentKey, tags: [] },
    callOptions,
  );
  const interval = getInterval(fromTimestamp, toTimestamp);
  const segments = allSegmentValues.map((value) => [{ key: segmentKey, value }]);
  const requests = await Promise.all(
    queries.map((q) => {
      const { metric, feature } = q;
      const req: GetMetricRollupRequest = {
        orgId,
        datasetId,
        metric,
        column: feature ?? undefined,
        interval,
        segments,
      };

      return getNumericMetricsSegmentRollup(req, callOptions);
    }),
  );

  return requests.flatMap((result) => result);
};

export const metrics = router({
  list: viewResourceDataProcedure
    .input(z.object({ skipMonitorMetrics: z.boolean().nullish(), skipLlmSecureMetrics: z.boolean().nullish() }))
    .query(async ({ ctx, input }) => {
      const { orgId, resourceId, skipMonitorMetrics, skipLlmSecureMetrics } = input;
      const callOptions = callOptionsFromTrpcContext(ctx);
      const resourceType = await getResourceType({ callOptions, orgId, resourceId });

      return getAllMetrics({ callOptions, input, resourceType, skipMonitorMetrics, skipLlmSecureMetrics });
    }),
  getAvailableDatasetMetrics: viewResourceDataProcedure
    .input(z.object({ includeLlmMetrics: z.boolean().nullish() }))
    .query(async ({ ctx, input }): Promise<MetricSchema[]> => {
      const { orgId, resourceId } = input;
      const includeLlmMetrics = input.includeLlmMetrics ?? undefined;
      const callOptions = callOptionsFromTrpcContext(ctx);
      const resourceType = await getResourceType({ callOptions, orgId, resourceId });

      return getDatasetMetrics({ callOptions, input, resourceType, includeLlmMetrics });
    }),
  listProfileMetrics: viewResourceDataProcedure.query(
    async ({ ctx, input }): Promise<Array<ProfileMetric | MonitorMetric>> => {
      const { orgId, resourceId } = input;
      const callOptions = callOptionsFromTrpcContext(ctx);
      const resourceType = await getResourceType({ callOptions, orgId, resourceId });

      const metrics = await getAllProfileMetrics({ callOptions, input, resourceType });
      return metrics.filter(({ targetLevel }) => targetLevel !== AnalysisTargetLevel.Dataset);
    },
  ),
  getRollUpMetricData: viewResourceDataProcedure
    .input((object: unknown) => object as RollUpMetricDataInputType)
    .query(async ({ input, ctx }) => {
      if (!input.queries.length) {
        return [];
      }
      validateQueryRequest(input);
      return getNumericMetrics(input, callOptionsFromTrpcContext(ctx));
    }),
  getSegmentGroupRollUpMetricData: viewResourceDataProcedure
    .input((object: unknown) => object as SegmentRollUpMetricInputType)
    .query(getSegmentRollUpMetricData),
});
