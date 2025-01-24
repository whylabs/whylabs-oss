import { ExtractUnion } from '~/types/genericTypes';
import { MetricSource } from '~server/graphql/resolvers/types/metrics';
import { CommonWidget, WidgetType } from '~server/trpc/dashboard/types/dashboards';
import { DataEvaluationParameters } from '~server/trpc/dashboard/types/data-evalutation-types';
import { CustomDashboardQueryCommon } from '~server/trpc/dashboard/types/queries';

export type ChartPlot = Partial<
  Pick<
    CustomDashboardQueryCommon,
    'color' | 'columnName' | 'disableColumn' | 'disableSegments' | 'displayName' | 'metricLabel' | 'resourceId'
  >
> & {
  id: string;
  metric?: string;
  metricField?: string;
  metricSource?: MetricSource;
  segment: string;
  type: DashboardGraphTypes;
};

export type ReadyToQueryChartPlot = ChartPlot & {
  metric: NonNullable<ChartPlot['metric']>;
  metricSource: NonNullable<ChartPlot['metricSource']>;
  resourceId: NonNullable<ChartPlot['resourceId']>;
};

export type DashboardGraphTypes = Exclude<WidgetType, 'dataComparison' | 'metricComparison'>;

export type ChartBuilderObject = Pick<CommonWidget, 'displayName' | 'id'> & {
  plots: ReadyToQueryChartPlot[];
  type: DashboardGraphTypes;
};

export type DashboardDataEvaluationTypes = ExtractUnion<WidgetType, 'dataComparison' | 'metricComparison'>;

export type DataEvaluationBuilderObject = Pick<CommonWidget, 'displayName' | 'id'> & {
  params: DataEvaluationParameters;
  type: DashboardDataEvaluationTypes;
};
export type DashboardWidgetObject = ChartBuilderObject | DataEvaluationBuilderObject;
