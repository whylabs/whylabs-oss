import { DefaultSchemaMetadata } from '@whylabs/data-service-node-client';

import { analysisMetricMap } from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import { AnalysisMetric, AnalysisTargetLevel, MetricSchema, MetricSource } from '../../../../graphql/generated/graphql';
import { findMetricMetadata, standardMetricsSchemas } from '../../../../graphql/resolvers/helpers/data-metrics';
import { ColumnSchema } from './entity-schema';

export const inferLlmMetricMetadata = (columns: ColumnSchema[], metadata: DefaultSchemaMetadata): MetricSchema[] => {
  const schemas: MetricSchema[] = [];
  const existingColumns = columns.map((column) => column.column);
  if (!metadata.metadata) return [];
  const llmMetadata = metadata.metadata.llm;
  existingColumns.forEach((col) => {
    const newestName = llmMetadata.aliases?.[col] ?? col;
    const colMetadata = llmMetadata.columnMetadata?.find((metadata) => metadata.name === newestName);
    if (!colMetadata) return;
    colMetadata.metrics?.forEach((metricMetadata) => {
      const builtinMetric = analysisMetricMap.get(metricMetadata.builtinMetric) ?? AnalysisMetric.Unknown;
      const defaultMetadata = findMetricMetadata(builtinMetric) ?? standardMetricsSchemas[0];
      schemas.push({
        ...defaultMetadata,
        source: MetricSource.Llm,
        label: metricMetadata.label ?? col,
        // metricName: metricMetadata.name, // add when available in custom metrics
        description: colMetadata.description,
        tags: colMetadata.tags,
        queryDefinition: {
          metric: builtinMetric,
          column: col,
          targetLevel: AnalysisTargetLevel.Column,
          metricLabel: defaultMetadata.label,
        },
      });
    });
  });
  return schemas;
};
