import { ModelType, useGetResourceBasicCategoryInfoQuery } from 'generated/graphql';
import {
  DATASET_COUNT_DATA_OTHER,
  DATASET_COUNT_DATA_SOURCE,
  DATASET_COUNT_DATA_STREAM,
  DATASET_COUNT_DATA_TRANSFORM,
  DATASET_COUNT_FIELDS,
  DATASET_COUNT_KEY,
  DatasetCountKeyFieldType,
  INVALID_QVS,
  MODEL_COUNT_CLASSIFICATION_KEY,
  MODEL_COUNT_FIELDS,
  MODEL_COUNT_KEY,
  MODEL_COUNT_OTHER_KEY,
  MODEL_COUNT_REGRESSION_KEY,
  ModelCountKeyFieldType,
  QueryValueSet,
  toResourceKeyFieldArray,
} from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

function getModelTypeFilterForKey(
  key: ModelCountKeyFieldType | DatasetCountKeyFieldType,
  defaultType: ModelType,
): ModelType {
  switch (key) {
    case MODEL_COUNT_CLASSIFICATION_KEY:
      return ModelType.Classification;
    case MODEL_COUNT_REGRESSION_KEY:
      return ModelType.Regression;
    case DATASET_COUNT_DATA_SOURCE:
      return ModelType.DataSource;
    case DATASET_COUNT_DATA_STREAM:
      return ModelType.DataStream;
    case DATASET_COUNT_DATA_TRANSFORM:
      return ModelType.DataTransform;
    default:
      return defaultType;
  }
}

function getNotOtherTypes(isModel: boolean): ModelType[] {
  if (isModel) {
    return [ModelType.Classification, ModelType.Regression];
  }
  return [ModelType.DataSource, ModelType.DataStream, ModelType.DataTransform];
}

export function useGetResourceClassificationInformation(primaryId: string, ...fieldIds: string[]): QueryValueSet {
  const { data, loading, error } = useGetResourceBasicCategoryInfoQuery();
  const isModel = primaryId === MODEL_COUNT_KEY;
  if (!isModel && primaryId !== DATASET_COUNT_KEY) {
    return INVALID_QVS;
  }

  const validFields: ModelCountKeyFieldType[] | DatasetCountKeyFieldType[] = isModel
    ? toResourceKeyFieldArray<ModelCountKeyFieldType>(fieldIds, MODEL_COUNT_FIELDS)
    : toResourceKeyFieldArray<DatasetCountKeyFieldType>(fieldIds, DATASET_COUNT_FIELDS);

  const resourceFilterFunction = makeResourceFilterFunction(isModel);
  const resources = data?.resources.filter((r) => resourceFilterFunction(r.assetCategory));
  const fieldValues: { [key: string]: number } | null = resources ? {} : null;
  const defaultType: ModelType = isModel ? ModelType.ModelOther : ModelType.DataOther;
  const notOtherTypes = getNotOtherTypes(isModel);
  const otherKey = isModel ? MODEL_COUNT_OTHER_KEY : DATASET_COUNT_DATA_OTHER;
  if (fieldValues !== null) {
    // Note: do not add the fieldTypes object if there is no valid input state.
    validFields.forEach((fid) => {
      const filterType = getModelTypeFilterForKey(fid, defaultType);
      if (filterType === defaultType) {
        fieldValues[otherKey] = resources?.filter((r) => !notOtherTypes.includes(r.modelType)).length ?? 0;
      } else {
        fieldValues[fid] = resources?.filter((r) => r.modelType === filterType).length ?? 0;
      }
    });
  }

  return {
    loading,
    error,
    value: resources?.length ?? null,
    fieldValues,
  };
}
