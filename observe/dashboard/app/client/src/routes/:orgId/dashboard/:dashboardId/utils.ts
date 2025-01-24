import { WidgetType } from '~server/trpc/dashboard/types/dashboards';

export const dashboardSupportedWidgetsMapper = new Map<string, WidgetType>([
  ['timeseries', 'timeseries'],
  ['pie', 'pie'],
  ['dataComparison', 'dataComparison'],
  ['metricComparison', 'metricComparison'],
]);

export type DrawerState = { open: boolean; widgetIndex: number };

export const needPermissionToCreateWidgetsTooltip = 'You need member or administrator permissions to create widgets';
