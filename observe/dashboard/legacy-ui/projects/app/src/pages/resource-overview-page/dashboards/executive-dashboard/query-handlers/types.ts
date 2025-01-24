import { ApolloError } from '@apollo/client';
import {
  AlertCategory,
  GetResourceAnomaliesTimeSeriesDataQuery,
  GetResourceBasicCategoryInfoQuery,
  GetResourceBasicInfoWithAnomaliesQuery,
} from 'generated/graphql';

// grid-area 1 - MODEL
export const MODEL_COUNT_KEY = 'model-count';
export const MODEL_COUNT_CLASSIFICATION_KEY = 'model-count-classification';
export const MODEL_COUNT_REGRESSION_KEY = 'model-count-regression';
export const MODEL_COUNT_OTHER_KEY = 'model-count-other';

// grid-area 1 - DATASET
export const DATASET_COUNT_KEY = 'dataset-count';
export const DATASET_COUNT_DATA_SOURCE = 'dataset-count-data-source';
export const DATASET_COUNT_DATA_STREAM = 'dataset-count-data-stream';
export const DATASET_COUNT_DATA_TRANSFORM = 'dataset-count-data-transform';
export const DATASET_COUNT_DATA_OTHER = 'dataset-count-other';

// grid-area 1 - UNIVERSAL
export const MONITORING_COVERAGE_KEY = 'monitoring-coverage';
export const MONITORING_COVERAGE_DATASET_ONLY = 'monitoring-coverage-dataset-only';
export const MONITORING_COVERAGE_MODEL_ONLY = 'monitoring-coverage-model-only';
// Anomaly and monitor types
export const INTEGRATION_TYPE = 'type-integration';
export const PERFORMANCE_TYPE = 'type-performance';
export const DATA_QUALITY_TYPE = 'type-data-quality';
export const DRIFT_TYPE = 'type-drift';

// grid-area 2 - MODEL
export const MODEL_PERC_ANOMALIES_KEY = 'model-percent-anomalies';
export const MODEL_PERC_ANOMALIES_INTEGRATION = 'model-percent-anomalies-integration';
export const MODEL_PERC_ANOMALIES_DATA = 'model-percent-anomalies-data';
export const MODEL_PERC_ANOMALIES_PERF = 'model-percent-anomalies-performance';
export const MODEL_COUNT_DRIFT_ISSUES = 'model-count-drift-issues';
export const MODEL_COUNT_DATA_ISSUES = 'model-count-data-issues';

export const MODEL_OVERALL_FIELD_INTEGRATION = 'models-with-ingestion';
export const MODEL_OVERALL_FIELD_DATA_QUALITY = 'models-with-data-quality';
export const MODEL_OVERALL_FIELD_DRIFT = 'models-with-drift';
export const MODEL_OVERALL_FIELD_PERFORMANCE = 'models-with-performance';

// grid-area 2 - DATASET
export const DATASET_PERC_ANOMALIES_KEY = 'dataset-percent-anomalies';
export const DATASET_FIELD_INGESTION_HEALTH = 'dataset-anomalies-integration-health';
export const DATASET_FIELD_DRIFT = 'dataset-anomalies-drift';
export const DATASET_FIELD_DATA_QUALITY = 'dataset-anomalies-data-quality';
export const DATASET_PERC_ANOMALIES_INTEGRATION = 'dataset-percent-anomalies-integration';
export const DATASET_PERC_ANOMALIES_DATA = 'dataset-percent-anomalies-data';
export const DATASET_COUNT_DRIFT_ISSUES = 'dataset-count-drift-issues';
export const DATASET_COUNT_DATA_ISSUES = 'dataset-count-data-issues';
export const NOTIFICATIONS_SENT_YESTERDAY = 'dataset-notifications-yesterday';
export const DATASET_TOTAL_RECORDS_YESTERDAY = 'dataset-total-records-yesterday';

// grid-area 3 - MODEL
export const MODEL_ANOMALIES_TIME_SERIES = 'model-anomalies-timeseries';
export const ANOMALIES_FIELD_INTEGRATION = 'anomaly-count-integration';
export const ANOMALIES_FIELD_DATA_QUALITY = 'anomaly-count-data-quality';
export const ANOMALIES_FIELD_DRIFT = 'anomaly-count-drift';
export const ANOMALIES_FIELD_PERFORMANCE = 'anomaly-count-performance';
export const MODEL_INPUT_BATCHES_TIME_SERIES = 'model-batches-count-timeseries';

// grid-area 3 - DATASET
export const DATASET_ANOMALIES_TIME_SERIES = 'dataset-anomalies-timeseries';
export const DATASET_INPUT_BATCHES_TIME_SERIES = 'dataset-batches-count-timeseries';

export const MODEL_COUNT_FIELDS = [
  MODEL_COUNT_CLASSIFICATION_KEY,
  MODEL_COUNT_REGRESSION_KEY,
  MODEL_COUNT_OTHER_KEY,
] as const;

export const DATASET_COUNT_FIELDS = [
  DATASET_COUNT_DATA_SOURCE,
  DATASET_COUNT_DATA_STREAM,
  DATASET_COUNT_DATA_TRANSFORM,
  DATASET_COUNT_DATA_OTHER,
] as const;

export const MONITORING_COVERAGE_FIELDS = [INTEGRATION_TYPE, DATA_QUALITY_TYPE, PERFORMANCE_TYPE, DRIFT_TYPE] as const;
export const DATASET_ONLY_COVERAGE_FIELDS = [INTEGRATION_TYPE, DRIFT_TYPE, DATA_QUALITY_TYPE] as const;

export const MODEL_PERC_PRIMARY_KEYS = [
  MODEL_PERC_ANOMALIES_KEY,
  MODEL_PERC_ANOMALIES_DATA,
  MODEL_PERC_ANOMALIES_INTEGRATION,
  MODEL_PERC_ANOMALIES_PERF,
] as const;

export const DATASET_PERC_PRIMARY_KEYS = [
  DATASET_PERC_ANOMALIES_KEY,
  DATASET_PERC_ANOMALIES_INTEGRATION,
  DATASET_PERC_ANOMALIES_DATA,
] as const;

export const DATASET_PERC_OVERALL_FIELDS = [
  DATASET_FIELD_INGESTION_HEALTH,
  DATASET_FIELD_DRIFT,
  DATASET_FIELD_DATA_QUALITY,
] as const;

export const MODEL_PERC_OVERALL_FIELDS = [
  MODEL_OVERALL_FIELD_INTEGRATION,
  MODEL_OVERALL_FIELD_DRIFT,
  MODEL_OVERALL_FIELD_PERFORMANCE,
  MODEL_OVERALL_FIELD_DATA_QUALITY,
] as const;

export const DATASET_PERC_DATA_FIELDS = [DATASET_COUNT_DRIFT_ISSUES, DATASET_COUNT_DATA_ISSUES] as const;
export const MODEL_PERC_FIELDS = [MODEL_COUNT_DRIFT_ISSUES, MODEL_COUNT_DATA_ISSUES] as const;
export const ANOMALIES_TIME_SERIES_FIELDS = [
  ANOMALIES_FIELD_INTEGRATION,
  ANOMALIES_FIELD_DATA_QUALITY,
  ANOMALIES_FIELD_DRIFT,
  ANOMALIES_FIELD_PERFORMANCE,
] as const;
export const KNOWN_KEYS = [
  MODEL_COUNT_KEY,
  MODEL_COUNT_CLASSIFICATION_KEY,
  MODEL_COUNT_REGRESSION_KEY,
  MODEL_COUNT_OTHER_KEY,
  MODEL_PERC_ANOMALIES_KEY,
  MODEL_PERC_ANOMALIES_DATA,
  MODEL_PERC_ANOMALIES_INTEGRATION,
  MODEL_PERC_ANOMALIES_PERF,
] as const;

export type KnownKeyType = typeof KNOWN_KEYS[number];
export type ModelCountKeyFieldType = typeof MODEL_COUNT_FIELDS[number];
export type DatasetCountKeyFieldType = typeof DATASET_COUNT_FIELDS[number];
export type ModelPercPrimaryType = typeof MODEL_PERC_PRIMARY_KEYS[number];
export type DatasetPercPrimaryType = typeof DATASET_PERC_PRIMARY_KEYS[number];
export type DatasetPercOverallFieldType = typeof DATASET_PERC_OVERALL_FIELDS[number];
export type ModelPercOverallFieldType = typeof MODEL_PERC_OVERALL_FIELDS[number];
export type DatasetPercDataFieldType = typeof DATASET_PERC_DATA_FIELDS[number];
export type ModelPercFieldType = typeof MODEL_PERC_FIELDS[number];
export type AnomaliesTimeSeriesFieldType = typeof ANOMALIES_TIME_SERIES_FIELDS[number];
export type MonitorAndAnomalyType = typeof MONITORING_COVERAGE_FIELDS[number];

export function isResourceKeyFieldType<KeyFieldType extends string>(
  possibleKey: string,
  keyFields: readonly KeyFieldType[],
): possibleKey is KeyFieldType {
  const validStrings = [...keyFields] as string[];
  return validStrings.includes(possibleKey);
}

export function toResourceKeyFieldArray<KeyFieldType extends string>(
  possibleKeys: string[],
  keyFields: readonly KeyFieldType[],
): KeyFieldType[] {
  const output: KeyFieldType[] = [];
  possibleKeys.forEach((pk) => {
    if (isResourceKeyFieldType<KeyFieldType>(pk, keyFields)) {
      output.push(pk);
    }
  });
  return output;
}

export function getAnomalyTypeByKey(
  fieldId:
    | ModelPercFieldType
    | DatasetPercDataFieldType
    | DatasetPercOverallFieldType
    | ModelPercOverallFieldType
    | AnomaliesTimeSeriesFieldType
    | MonitorAndAnomalyType,
): AlertCategory {
  switch (fieldId) {
    case MODEL_COUNT_DATA_ISSUES:
    case ANOMALIES_FIELD_DATA_QUALITY:
    case MODEL_OVERALL_FIELD_DATA_QUALITY:
    case DATASET_FIELD_DATA_QUALITY:
    case DATASET_COUNT_DATA_ISSUES:
    case DATA_QUALITY_TYPE:
      return AlertCategory.DataQuality;
    case MODEL_COUNT_DRIFT_ISSUES:
    case ANOMALIES_FIELD_DRIFT:
    case MODEL_OVERALL_FIELD_DRIFT:
    case DATASET_COUNT_DRIFT_ISSUES:
    case DATASET_FIELD_DRIFT:
    case DRIFT_TYPE:
      return AlertCategory.DataDrift;
    case ANOMALIES_FIELD_INTEGRATION:
    case MODEL_OVERALL_FIELD_INTEGRATION:
    case DATASET_FIELD_INGESTION_HEALTH:
    case INTEGRATION_TYPE:
      return AlertCategory.Ingestion;
    case MODEL_OVERALL_FIELD_PERFORMANCE:
    case ANOMALIES_FIELD_PERFORMANCE:
    case PERFORMANCE_TYPE:
      return AlertCategory.Performance;
  }
  return AlertCategory.Unknown;
}
export type TimeSeriesValue = { timestamp: number; value?: number | null };
type TimeSeriesFieldValues = { timestamp: number; values: { [key: string]: number } | null };
export interface QueryValueSet {
  value: number | null;
  altValue?: number | null;
  fieldValues?: { [key: string]: number } | null;
  timeSeriesValues?: TimeSeriesValue[];
  timeSeriesFieldValues?: TimeSeriesFieldValues[];
  loading: boolean;
  error: ApolloError | undefined;
  invalid?: boolean;
}

export type FieldValueObject = QueryValueSet['fieldValues'];

export const INVALID_QVS: QueryValueSet = {
  value: null,
  loading: false,
  error: undefined,
  invalid: true,
};

export type Model = GetResourceBasicCategoryInfoQuery['resources'][number];
export type ModelWithAnomalies = GetResourceBasicInfoWithAnomaliesQuery['resources'][number];
export type ResourceWithTimeSeriesData = GetResourceAnomaliesTimeSeriesDataQuery['resources'][number];
