import { SegmentTag } from '@whylabs/songbird-node-client';

import { AnalysisMetric } from '../../../graphql/generated/graphql';
import { GenericMetric, MetricSource } from '../../../graphql/resolvers/types/metrics';

type QueryUnit = 'count' | 'percentage' | 'USD' | 'kylobytes' | 'milliseconds';

export type CustomDashboardQueryCommon = Pick<GenericMetric, 'disableColumn' | 'disableSegments' | 'source'> & {
  color?: string;
  columnName?: string;
  displayName?: string;
  queryId: string;
  metricLabel?: string;
  resourceId: string;
  source: MetricSource;
  unit: QueryUnit;
};

export type PieChartQuery = CustomDashboardQueryCommon & {
  segment?: SegmentTag[];
  source: 'Frequent Items';
};

export type TimeseriesProfileQuery = CustomDashboardQueryCommon & {
  metric: AnalysisMetric;
  segment: SegmentTag[];
  source: 'Profiles';
};

export type TimeseriesMonitorQuery = CustomDashboardQueryCommon & {
  metric: string;
  metricField?: string;
  segment?: SegmentTag[];
  source: 'Monitors';
};

export type TimeseriesLlmQuery = CustomDashboardQueryCommon & {
  metric: string;
  metricField?: string;
  source: 'LLM';
};

export type TimeseriesQueryUnion = TimeseriesProfileQuery | TimeseriesMonitorQuery | TimeseriesLlmQuery;
