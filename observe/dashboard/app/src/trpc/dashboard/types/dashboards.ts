import { DataGranularity } from '@whylabs/data-service-node-client';

import { TimePeriod } from '../../../graphql/generated/graphql';
import { DataEvaluationParameters } from './data-evalutation-types';
import { PieChartQuery, TimeseriesQueryUnion } from './queries';

export type WidgetType = 'timeseries' | 'pie' | 'dataComparison' | 'metricComparison';

export type CommonWidget = {
  id: string;
  displayName: string;
  type: WidgetType;
};

export type TimeseriesChart = CommonWidget & {
  rollupGranularity?: DataGranularity;
  timeseries: TimeseriesQueryUnion[];
  type: 'timeseries';
};

export type PieChart = CommonWidget & {
  pie: PieChartQuery[];
  type: 'pie';
};

export type DataEvaluation = CommonWidget & {
  params: DataEvaluationParameters;
  type: 'dataComparison' | 'metricComparison';
};

export type ChartUnion = TimeseriesChart | PieChart;

export type CustomDashboardWidgets = ChartUnion | DataEvaluation;

export enum DashboardDateRangeType {
  fixed = 'fixedRange',
  relative = 'trailingWindow',
}
export type TrailingWindowDateRange = {
  type: DashboardDateRangeType.relative;
  timePeriod: TimePeriod;
  size: number;
};

export type FixedDateRange = {
  type: DashboardDateRangeType.fixed;
  // dates should be ISO string i.e. YYYY-MM-DDTHH:MM:SS.SSSZ'
  startDate: string;
  endDate: string;
};

export type CustomDashboardDateRange = TrailingWindowDateRange | FixedDateRange;

type DashboardMetadata = {
  usedOn?: string;
};

/**
 * Represent multiple panels:
 * - It dictates the time range of the data
 * - It dictates the rollup logic (though user shouldn't set it by default) - this is not gonna be implemented for a while
 * - it contains the global variables that can be used for value replacement.
 * *** Update customDashboardSchemaParserV1 when including a new field here
 */
export type CustomDashboardSchema = {
  charts: CustomDashboardWidgets[];
  dateRange?: CustomDashboardDateRange;
  id: string;
  metadata?: DashboardMetadata;
  version: number;
};

export enum CustomDashboardOrderByEnum {
  ID = 'id',
  Location = 'location',
  Author = 'author',
  CreationTimestamp = 'creationTimestamp',
  DisplayName = 'displayName',
  LastUpdatedTimestamp = 'lastUpdatedTimestamp',
}
