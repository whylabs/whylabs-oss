import { AnalysisTargetLevel, MetricDataType, MetricDirection, MetricQueryDefinition } from '../../generated/graphql';

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
  queryDefinition?: MetricQueryDefinition | null;
};

export type ProfileMetric = GenericMetric & {
  fixedColumn?: string | null;
  metricDirection?: MetricDirection | null;
  source: 'Profiles';
  queryDefinition?: MetricQueryDefinition | null;
  dataType: MetricDataType;
  unitInterval?: boolean | null;
  showAsPercent?: boolean | null;
};

export type MonitorMetric = GenericMetric & {
  metricField: string;
  monitorId: string;
  source: 'Monitors';
  timestampField?: string;
};

export type MetricTypeUnion = LlmMetric | ProfileMetric | MonitorMetric;
