import { AnalysisTargetLevel, MetricDirection } from '../../../types/api';

export const CUSTOM_METRIC_VALUE_SEPARATOR = '::';

export type MetricSource = 'LLM' | 'Monitors' | 'Profiles' | 'Frequent Items';

export type GenericMetric = {
  disableColumn?: boolean;
  disableSegments?: boolean;
  group: string;
  label: string;
  source: MetricSource;
  targetLevel?: AnalysisTargetLevel;
  value: string;
};

export type LlmMetric = GenericMetric & {
  source: 'LLM';
};

export type ProfileMetric = GenericMetric & {
  fixedColumn?: string | null;
  metricDirection?: MetricDirection | null;
  source: 'Profiles';
};

export type MonitorMetric = GenericMetric & {
  metricField: string;
  monitorId: string;
  source: 'Monitors';
  timestampField?: string;
};
