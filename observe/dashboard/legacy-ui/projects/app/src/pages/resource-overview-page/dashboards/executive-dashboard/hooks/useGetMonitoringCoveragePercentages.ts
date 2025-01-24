import { AlertCategory, AssetCategory, useGetResourceCoverageInfoQuery } from 'generated/graphql';
import {
  DATASET_ONLY_COVERAGE_FIELDS,
  FieldValueObject,
  INVALID_QVS,
  MONITORING_COVERAGE_DATASET_ONLY,
  MONITORING_COVERAGE_FIELDS,
  MONITORING_COVERAGE_KEY,
  MONITORING_COVERAGE_MODEL_ONLY,
  MonitorAndAnomalyType,
  QueryValueSet,
  getAnomalyTypeByKey,
  toResourceKeyFieldArray,
} from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

const VALID_PRIMARY_IDS = [
  MONITORING_COVERAGE_DATASET_ONLY,
  MONITORING_COVERAGE_MODEL_ONLY,
  MONITORING_COVERAGE_KEY,
] as const;
type PrimaryIdType = typeof VALID_PRIMARY_IDS[number];

function asPrimaryId(possibleId: string): PrimaryIdType | null {
  if (([...VALID_PRIMARY_IDS] as string[]).includes(possibleId)) {
    return possibleId as PrimaryIdType;
  }
  return null;
}

function getValidFields(primaryId: PrimaryIdType, ...fieldIds: string[]): MonitorAndAnomalyType[] {
  if (primaryId === MONITORING_COVERAGE_DATASET_ONLY) {
    return toResourceKeyFieldArray<MonitorAndAnomalyType>(fieldIds, DATASET_ONLY_COVERAGE_FIELDS);
  }
  return toResourceKeyFieldArray<MonitorAndAnomalyType>(fieldIds, MONITORING_COVERAGE_FIELDS);
}

function getFilterCategory(primaryKey: string): AssetCategory | null {
  if (primaryKey === MONITORING_COVERAGE_DATASET_ONLY) {
    return AssetCategory.Data;
  }
  if (primaryKey === MONITORING_COVERAGE_MODEL_ONLY) {
    return AssetCategory.Model;
  }
  return null;
}

function createFieldValueInitialObject(...fieldIds: MonitorAndAnomalyType[]): FieldValueObject {
  const fieldValueObject: FieldValueObject = {};
  fieldIds.forEach((fid) => {
    fieldValueObject[fid] = 0;
  });
  return fieldValueObject;
}

export function useGetMonitoringCoveragePercentages(primaryId: string, ...fieldIds: string[]): QueryValueSet {
  const { data, loading, error } = useGetResourceCoverageInfoQuery();
  const validPrimary = asPrimaryId(primaryId);
  if (!validPrimary) {
    return INVALID_QVS;
  }

  const validFields = getValidFields(validPrimary, ...fieldIds);
  const outputQvs: QueryValueSet = { value: null, fieldValues: null, loading, error };

  const filterCategory = getFilterCategory(primaryId);
  const filterFunction = makeResourceFilterFunction(filterCategory === AssetCategory.Model);

  const usedResources = filterCategory
    ? data?.resources.filter((r) => filterFunction(r.assetCategory))
    : data?.resources;

  const totalCoverageCount =
    usedResources?.filter((r) => r.monitoredCategories && r.monitoredCategories?.length > 0).length ?? 0;
  const totalCoverageRatio = usedResources && usedResources.length > 0 ? totalCoverageCount / usedResources.length : 0;
  const alertTypeMap = validFields.reduce<Map<AlertCategory, MonitorAndAnomalyType>>((acc, curr) => {
    const shallowCopy = new Map(acc);
    shallowCopy.set(getAnomalyTypeByKey(curr), curr);
    return shallowCopy;
  }, new Map());

  const fieldValues = createFieldValueInitialObject(...validFields);
  if (!fieldValues) {
    // Shouldn't be possible at this point, but returning to make TS happy
    return INVALID_QVS;
  }
  usedResources?.forEach((r) => {
    if (r.monitoredCategories) {
      // In theory, we should only be getting back each category a maximum of one time.
      // However, this is an array sent to us from a service that may one day have bugs.
      // We create this set to ensure we're counting each value at most once.
      const updatedFieldValues = new Set<string>();
      r.monitoredCategories.forEach((mc) => {
        const fieldValue = alertTypeMap.get(mc);
        if (fieldValue && Object.keys(fieldValues).includes(fieldValue) && !updatedFieldValues.has(fieldValue)) {
          fieldValues[fieldValue] += 1;
          updatedFieldValues.add(fieldValue); // to make sure that this category isn't getting counted twice.
        }
      });
    }
  });

  // At this point, `fieldValues` is currently a count of the monitored categories. We need to convert it to a percentage.
  if (usedResources && usedResources.length > 0) {
    Object.keys(fieldValues).forEach((fv) => {
      fieldValues[fv] /= usedResources.length;
    });
  }

  outputQvs.value = totalCoverageRatio;
  outputQvs.fieldValues = fieldValues;

  return outputQvs;
}
