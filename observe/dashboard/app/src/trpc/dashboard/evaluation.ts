import { DataEvaluationRequest, DataEvaluationResponse } from '@whylabs/data-service-node-client';
import { v4 as uuid } from 'uuid';

import { TimePeriod } from '../../graphql/generated/graphql';
import { fetchEvaluationTable } from '../../services/data/data-service/api-wrappers/data-comparison';
import { toBuiltinProfileMetric } from '../../services/data/data-service/data-service-utils';
import { addOneMillisecondToDate, timePeriodToTimeElement } from '../../util/time-period-utils';
import { router, viewResourceDataProcedure } from '../trpc';
import { rangeTranslatorByTimePeriod } from '../util/bucketUtils';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { DashboardDateRangeType } from './types/dashboards';
import {
  COLUMN_METRIC_QUERY_ID_PREFIX,
  DATASET_METRIC_COLUMN_VALUE,
  DATASET_METRIC_QUERY_ID_PREFIX,
  DataEvaluationParameters,
  EvaluationAggregationType,
  OVERALL_SEGMENT_KEY_VALUE,
} from './types/data-evalutation-types';

const translateDateRangeToISOStandard = (params: DataEvaluationParameters): string | undefined => {
  if (params.type !== EvaluationAggregationType.DateRange) return undefined;
  const { dateRange } = params;
  if (dateRange.type === DashboardDateRangeType.fixed) return `${dateRange.startDate}/${dateRange.endDate}`;
  const { timePeriod, size } = dateRange;
  const { endFn } = rangeTranslatorByTimePeriod.get(timePeriod) ?? {};
  const isHourly = timePeriod === TimePeriod.Pt1H;
  const unit = timePeriodToTimeElement.get(timePeriod) ?? 'D';

  const endOfCurrentBucket = endFn ? endFn(new Date()) : new Date();
  // duration / end date
  return `P${isHourly ? 'T' : ''}${size}${unit}/${addOneMillisecondToDate(endOfCurrentBucket).toISOString()}`;
};

const getColumnSegments = (params: DataEvaluationParameters): string[] | undefined => {
  if (params.type !== EvaluationAggregationType.DateRange || !params.tableColumnsDefinition.groupBySegmentKey)
    return undefined;
  return params.tableColumnsDefinition.segmentValues?.map(
    (value) => `${params.tableColumnsDefinition.groupBySegmentKey}=${value}`,
  );
};

const getReferenceProfiles = (params: DataEvaluationParameters): string[] | undefined => {
  if (params.type !== EvaluationAggregationType.ReferenceProfile) return undefined;
  return params.tableColumnsDefinition.referenceProfileIds;
};

const getMetricQueries = (params: DataEvaluationParameters): DataEvaluationRequest['queries'] => {
  const { resourceId, dataSource } = params;
  const queries: DataEvaluationRequest['queries'] = [];
  dataSource.metrics.forEach((metric) => {
    const commonParams = { resourceId, metric: toBuiltinProfileMetric(metric.metric) };
    const isDatasetMetrics = !!metric.column; // column will be from custom-metric definition or `*_DATASET_*` placeholder for performance metrics
    if (isDatasetMetrics) {
      const column = metric.column === DATASET_METRIC_COLUMN_VALUE ? undefined : metric.column;
      queries.push({
        ...commonParams,
        queryId: `${DATASET_METRIC_QUERY_ID_PREFIX}${uuid()}`,
        columnName: column,
      });
      return;
    }
    // if is a column metric, we will query this metric for all columns
    dataSource.resourceColumns.forEach((resourceColumn) => {
      queries.push({
        ...commonParams,
        queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}${uuid()}`,
        columnName: resourceColumn,
      });
    });
  });

  return queries;
};

const getRowGrouping = (params: DataEvaluationParameters): string | undefined => {
  const { tableRowsDefinition } = params;
  const rowSegment = tableRowsDefinition?.rowSegmentGroup?.[0];
  if (rowSegment === OVERALL_SEGMENT_KEY_VALUE) return undefined;
  return rowSegment;
};

const transformParametersForAPI = (params: DataEvaluationParameters): DataEvaluationRequest => {
  return {
    queries: getMetricQueries(params),
    referenceProfiles: getReferenceProfiles(params),
    columnSegments: getColumnSegments(params),
    rowSegmentGroup: getRowGrouping(params),
    interval: translateDateRangeToISOStandard(params),
  };
};

export const evaluation = router({
  fetchDataEvaluation: viewResourceDataProcedure
    .input((params: unknown) => params as DataEvaluationParameters)
    .query(async ({ input, ctx }): Promise<DataEvaluationResponse> => {
      const { orgId, ...params } = input;
      const callOptions = callOptionsFromTrpcContext(ctx);
      const request = transformParametersForAPI(params);
      if (!request.queries.length) return { entries: [] };
      return fetchEvaluationTable(orgId, request, callOptions);
    }),
});
