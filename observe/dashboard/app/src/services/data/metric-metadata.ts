import { MetricDirection } from '../../graphql/generated/graphql';
import { DataServiceAnalysisMetric } from './data-service/data-service-types';

export type DefaultMetricMetadata = {
  name: string;
  label: string;
  builtinMetric: DataServiceAnalysisMetric;
  metricDirection?: MetricDirection;
};

export type DefaultColumnMetadata = {
  name: string;
  description?: string;
  tags: string[];
  metrics: DefaultMetricMetadata[];
};

export type DefaultMetadata = {
  aliases: Record<string, string>;
  columnMetadata: DefaultColumnMetadata[];
};

export type MetricMetadata = {
  metadata: Record<string, DefaultMetadata>;
};
