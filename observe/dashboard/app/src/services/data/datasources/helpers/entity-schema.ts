import { DefaultSchemaMetadata } from '@whylabs/data-service-node-client';
import { v4 as uuid } from 'uuid';

import { analysisMetricToGQL } from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import {
  AnalysisTargetLevel,
  CustomMetric,
  Dataset,
  Metric,
  MetricDataType,
  MetricSchema,
  MetricSource,
  ModelType,
  TimePeriod,
} from '../../../../graphql/generated/graphql';
import {
  filterMetricsByTags,
  findMetricMetadata,
  findPerformanceMetricMetadata,
} from '../../../../graphql/resolvers/helpers/data-metrics';
import {
  DataServiceAnalysisMetric,
  DerivedMetric,
  classificationMetrics,
  regressionMetrics,
} from '../../data-service/data-service-types';
import { inferLlmMetricMetadata } from './infer-llm-info';

// these column types are no longer supported, but may still exist in the schema
type DeprecatedColumnType = 'boolean';
// these column types exist in the monitor config / entity schema
export type ColumnDataType = 'integral' | 'fractional' | 'bool' | 'string' | 'unknown' | 'null' | DeprecatedColumnType;
export type ColumnDiscreteness = 'continuous' | 'discrete';
export type ColumnSchema = {
  column: string; // name of the column
  classifier: string; // should be input or output
  dataType: string | null; // should be one of ColumnDataType
  discreteness: ColumnDiscreteness;
  tags?: string[];
};
export type CustomPerformanceMetric = {
  label: string; // user-facing label for the custom performance metric
  column: string; // column to target
  defaultMetric: DataServiceAnalysisMetric; // whylogs metric to use
};
type EntitySchema = {
  metrics?: CustomPerformanceMetric[];
  columns: ColumnSchema[];
};
export type IndexedEntitySchema = {
  orgId: string;
  datasetId: string;
  entitySchema: EntitySchema;
};

export const getDataTypeFromString = new Map<string, ColumnDataType>([
  ['integral', 'integral'],
  ['fractional', 'fractional'],
  ['bool', 'bool'],
  ['boolean', 'bool'],
  ['string', 'string'],
  ['unknown', 'unknown'],
  ['null', 'null'],
]);
// note MetricInfo is the same for distribution and numeric metrics
export type MetricInfo = Omit<Metric, 'values' | '__typename'>;
/**
 * Helper function for Metric[] array of known metric data with custom metrics defined in the Entity Schema
 * @param dataset Dataset to generate list of metrics for
 * @param customMetrics List of custom metrics defined for this dataset (available via Entity Schema datasource)
 */
export const getMetricInfo = (dataset: Dataset, customMetrics: MetricSchema[]): MetricInfo[] => {
  const baseMetrics: MetricInfo[] = getBaseDatasetMetrics(dataset.modelType).map((metric) => {
    return {
      datasetGranularity: dataset.batchFrequency,
      datasetId: dataset.datasetId,
      id: uuid(),
      name: metric,
      segmentTags: dataset.tags,
      metadata: findPerformanceMetricMetadata(metric),
    };
  });

  const customDatasetMetrics: MetricInfo[] = customMetrics.map((customMetric) => ({
    datasetGranularity: dataset.batchFrequency,
    datasetId: dataset.datasetId,
    id: uuid(),
    name: customMetric.label, // replace with metricName when available from songbird
    segmentTags: dataset.tags,
    metadata: customMetric,
  }));

  return baseMetrics.concat(customDatasetMetrics);
};
export const getNumericOrDistributionMetrics = (
  dataset: Dataset,
  customMetrics: MetricSchema[],
  datasetGranularity: TimePeriod,
): CustomMetric[] => {
  const metrics: MetricInfo[] = getMetricInfo(dataset, customMetrics);
  return metrics.map((m) => ({
    ...m,
    datasetGranularity,
    numericValues: [],
    distributionValues: [],
  }));
};
const findColumnTags = (column: string, schema: IndexedEntitySchema): string[] => {
  const columnSchema = schema.entitySchema.columns.find((c) => c.column === column);
  let tags = columnSchema ? columnSchema.tags : [];
  if (!tags || !tags.length) {
    // default to performance if no tags are found
    tags = ['performance'];
  }
  return tags;
};

const schemaMetricToGQL = (
  orgId: string,
  datasetId: string,
  metric: CustomPerformanceMetric,
  schema: IndexedEntitySchema,
  modelType: ModelType,
): MetricSchema => {
  const tags = findColumnTags(metric.column, schema);
  if (!tags.includes('performance') && modelType !== ModelType.Llm) {
    // default to including performance for non-LLM models as there is no other custom category supported currently
    tags.push('performance');
  }
  const builtInMetric = analysisMetricToGQL(
    {
      dataType: 'metric',
      datasetId,
      featureName: metric.column,
      orgId,
    },
    metric.defaultMetric,
  );
  const metadata = findMetricMetadata(builtInMetric);
  const metricLabel = metadata?.queryDefinition?.metricLabel ?? builtInMetric;
  return {
    // Inherit metadata like kind, showAsPercent from built-in metric (future: override in entity schema metric)
    ...metadata,
    dataType: metadata?.dataType ?? MetricDataType.Float,
    label: metric.label,
    // metricName: metric.metricName,
    source: MetricSource.UserDefined,
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column, // custom metrics are queried from regular columns
      column: metric.column,
      metric: builtInMetric,
      metricLabel, // this is the label for the built-in metric, not the custom metric
    },
    tags,
  };
};

type CustomMetricsOptions = {
  tags?: string[];
};

export const getCustomMetrics = async (
  schema: IndexedEntitySchema | null,
  orgId: string,
  resourceId: string,
  resourceType: ModelType,
  { tags }: CustomMetricsOptions = {},
  metadata?: DefaultSchemaMetadata, // must be passed in if inferred named metrics (e.g. LLM) are to be included
): Promise<MetricSchema[]> => {
  if (!schema) return [];
  // get inferred metric metadata for columns matching the requested tags
  const customMetrics: MetricSchema[] = (schema.entitySchema.metrics ?? []).map((metric) =>
    schemaMetricToGQL(orgId, resourceId, metric, schema, resourceType),
  );
  const llmMetrics =
    resourceType === ModelType.Llm && metadata ? inferLlmMetricMetadata(schema.entitySchema.columns, metadata) : [];
  // Filter out llm metrics where there's a custom metric for the same column
  const customColumnNames = customMetrics.map((m) => m.queryDefinition?.column);
  const llmMetricsWithoutCustom = llmMetrics.filter((m) => !customColumnNames.includes(m.queryDefinition?.column));
  return filterMetricsByTags([...llmMetricsWithoutCustom, ...customMetrics], tags ?? []);
};
/**
 * Returns the well-known whylogs dataset-level metrics based on model type
 * @param modelType
 */
export const getBaseDatasetMetrics = (modelType: ModelType): readonly DerivedMetric[] => {
  switch (modelType) {
    case ModelType.Classification:
      return classificationMetrics;
    case ModelType.Regression:
      return regressionMetrics;
    case ModelType.Unknown:
    default:
      // other model types not yet supported
      return [];
  }
};
