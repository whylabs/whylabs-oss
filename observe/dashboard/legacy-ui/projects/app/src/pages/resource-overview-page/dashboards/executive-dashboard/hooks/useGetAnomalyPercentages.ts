import { AlertCategory, useGetResourceBasicInfoWithAnomaliesQuery } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import {
  DATASET_PERC_ANOMALIES_DATA,
  DATASET_PERC_ANOMALIES_INTEGRATION,
  DATASET_PERC_ANOMALIES_KEY,
  DatasetPercDataFieldType,
  DatasetPercOverallFieldType,
  INVALID_QVS,
  MODEL_PERC_ANOMALIES_DATA,
  MODEL_PERC_ANOMALIES_INTEGRATION,
  MODEL_PERC_ANOMALIES_KEY,
  MODEL_PERC_ANOMALIES_PERF,
  ModelPercFieldType,
  ModelWithAnomalies,
  QueryValueSet,
  toResourceKeyFieldArray,
  MODEL_PERC_FIELDS,
  DATASET_PERC_OVERALL_FIELDS,
  DATASET_PERC_DATA_FIELDS,
  isResourceKeyFieldType,
  ModelPercPrimaryType,
  MODEL_PERC_PRIMARY_KEYS,
  DatasetPercPrimaryType,
  DATASET_PERC_PRIMARY_KEYS,
  getAnomalyTypeByKey,
  ModelPercOverallFieldType,
  MODEL_PERC_OVERALL_FIELDS,
} from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

function countModelsWithAnomaliesOfTypes(models: ModelWithAnomalies[], ...categories: AlertCategory[]): number {
  return (
    models.filter((m) =>
      m.allAnomalyCounts?.totals.some(
        (tot) => tot.count > 0 && (categories.length === 0 || categories.includes(tot.category)),
      ),
    ).length ?? 0
  );
}

function getValidFields(
  primaryId: string,
  ...fieldIds: string[]
): ModelPercFieldType[] | DatasetPercDataFieldType[] | DatasetPercOverallFieldType[] | ModelPercOverallFieldType[] {
  if (primaryId === MODEL_PERC_ANOMALIES_DATA) {
    return toResourceKeyFieldArray<ModelPercFieldType>(fieldIds, MODEL_PERC_FIELDS);
  }
  if (primaryId === DATASET_PERC_ANOMALIES_KEY) {
    return toResourceKeyFieldArray<DatasetPercOverallFieldType>(fieldIds, DATASET_PERC_OVERALL_FIELDS);
  }
  if (primaryId === DATASET_PERC_ANOMALIES_DATA) {
    return toResourceKeyFieldArray<DatasetPercDataFieldType>(fieldIds, DATASET_PERC_DATA_FIELDS);
  }
  if (primaryId === MODEL_PERC_ANOMALIES_KEY) {
    return toResourceKeyFieldArray<ModelPercOverallFieldType>(fieldIds, MODEL_PERC_OVERALL_FIELDS);
  }
  return [];
}

export function useGetAnomalyPercentages(primaryId: string, ...fieldIds: string[]): QueryValueSet {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data, loading, error } = useGetResourceBasicInfoWithAnomaliesQuery({
    variables: {
      ...dateRange,
    },
    skip: loadingDateRange,
  });
  const isModel = isResourceKeyFieldType<ModelPercPrimaryType>(primaryId, MODEL_PERC_PRIMARY_KEYS);
  const isDataset = isResourceKeyFieldType<DatasetPercPrimaryType>(primaryId, DATASET_PERC_PRIMARY_KEYS);
  if (!isModel && !isDataset) {
    return INVALID_QVS;
  }
  const filterFunction = makeResourceFilterFunction(isModel);

  const singleTypeOnly = data?.resources.filter((m) => filterFunction(m.assetCategory)) ?? null;
  const resourceCount = singleTypeOnly?.length ?? null;
  const resourcesWithAnomalies =
    singleTypeOnly?.filter((m) => m.allAnomalyCounts?.totals.some((tot) => tot.count > 0)) ?? null;

  const fieldValues: { [key: string]: number } = {};

  const validFieldIds = getValidFields(primaryId, ...fieldIds);

  validFieldIds.forEach((fid) => {
    fieldValues[fid] = 0;
  });
  if (resourceCount === 0) {
    return {
      value: 0,
      altValue: 0,
      fieldValues: {},
      loading,
      error,
    };
  }
  if (resourceCount === null || resourcesWithAnomalies === null) {
    return {
      value: null,
      altValue: null,
      fieldValues: null,
      loading,
      error,
    };
  }
  // Note that for all of these, we have already taken care of the case where the `modelCount` field is 0.
  switch (primaryId) {
    case MODEL_PERC_ANOMALIES_KEY:
      validFieldIds.forEach((fid) => {
        fieldValues[fid] = countModelsWithAnomaliesOfTypes(resourcesWithAnomalies, getAnomalyTypeByKey(fid));
      });
      return {
        value: resourcesWithAnomalies.length / resourceCount,
        altValue: resourcesWithAnomalies.length,
        fieldValues,
        loading,
        error,
      };
    case DATASET_PERC_ANOMALIES_KEY:
      validFieldIds.forEach((fid) => {
        fieldValues[fid] = countModelsWithAnomaliesOfTypes(resourcesWithAnomalies, getAnomalyTypeByKey(fid));
      });
      return {
        value: resourcesWithAnomalies.length / resourceCount,
        altValue: resourcesWithAnomalies.length,
        fieldValues,
        loading,
        error,
      };
    case MODEL_PERC_ANOMALIES_DATA: {
      const modelsWithDataIssues = countModelsWithAnomaliesOfTypes(
        resourcesWithAnomalies,
        AlertCategory.DataDrift,
        AlertCategory.DataQuality,
      );
      validFieldIds.forEach((fid) => {
        fieldValues[fid] = countModelsWithAnomaliesOfTypes(resourcesWithAnomalies, getAnomalyTypeByKey(fid));
      });
      return {
        value: modelsWithDataIssues / resourceCount,
        altValue: modelsWithDataIssues,
        fieldValues,
        loading,
        error,
      };
    }
    case DATASET_PERC_ANOMALIES_DATA: {
      const resourcesWithDataIssues = countModelsWithAnomaliesOfTypes(
        resourcesWithAnomalies,
        AlertCategory.DataDrift,
        AlertCategory.DataQuality,
      );
      validFieldIds.forEach((fid) => {
        fieldValues[fid] = countModelsWithAnomaliesOfTypes(resourcesWithAnomalies, getAnomalyTypeByKey(fid));
      });
      return {
        value: resourcesWithDataIssues / resourceCount,
        altValue: resourcesWithDataIssues,
        fieldValues,
        loading,
        error,
      };
    }
    case MODEL_PERC_ANOMALIES_INTEGRATION: {
      const modelsWithIntegrationCount = countModelsWithAnomaliesOfTypes(
        resourcesWithAnomalies,
        AlertCategory.Ingestion,
      );
      return {
        value: modelsWithIntegrationCount / resourceCount,
        altValue: modelsWithIntegrationCount,
        loading,
        error,
      };
    }
    case DATASET_PERC_ANOMALIES_INTEGRATION: {
      const resourcesWithIntegrationCount = countModelsWithAnomaliesOfTypes(
        resourcesWithAnomalies,
        AlertCategory.Ingestion,
      );
      return {
        value: resourcesWithIntegrationCount / resourceCount,
        altValue: resourcesWithIntegrationCount,
        loading,
        error,
      };
    }
    case MODEL_PERC_ANOMALIES_PERF: {
      const modelsWithPerfCount = countModelsWithAnomaliesOfTypes(resourcesWithAnomalies, AlertCategory.Performance);
      return {
        value: modelsWithPerfCount / resourceCount,
        altValue: modelsWithPerfCount,
        loading,
        error,
      };
    }
  }
  return INVALID_QVS;
}
