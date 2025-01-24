import { AlertCategory, GroupedAlertBatch, useGetResourceAnomaliesTimeSeriesDataQuery } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import {
  ResourceWithTimeSeriesData,
  INVALID_QVS,
  MODEL_ANOMALIES_TIME_SERIES,
  ANOMALIES_TIME_SERIES_FIELDS,
  AnomaliesTimeSeriesFieldType,
  QueryValueSet,
  getAnomalyTypeByKey,
  toResourceKeyFieldArray,
  DATASET_ANOMALIES_TIME_SERIES,
} from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

function getValidFields(primaryId: string, ...fieldIds: string[]): AnomaliesTimeSeriesFieldType[] {
  if (primaryId === MODEL_ANOMALIES_TIME_SERIES || primaryId === DATASET_ANOMALIES_TIME_SERIES) {
    return toResourceKeyFieldArray<AnomaliesTimeSeriesFieldType>(fieldIds, ANOMALIES_TIME_SERIES_FIELDS);
  }
  // TODO: Add the dataset version
  return [];
}

// TODO: make this generic for datasets too.
function categoryToFieldId(category: AlertCategory): AnomaliesTimeSeriesFieldType | null {
  switch (category) {
    case AlertCategory.DataDrift:
      return 'anomaly-count-drift';
    case AlertCategory.DataQuality:
      return 'anomaly-count-data-quality';
    case AlertCategory.Ingestion:
      return 'anomaly-count-integration';
    case AlertCategory.Performance:
      return 'anomaly-count-performance';
  }
  return null;
}

function countTotalAnomaliesInRangeOfType(
  resources: ResourceWithTimeSeriesData[],
  ...categories: AlertCategory[]
): number | null {
  if (categories.length === 0) {
    return null;
  }
  return resources.reduce((acc, curr) => {
    const currentTotal =
      curr.allAnomalyCounts?.totals.reduce((totAcc, totCurr) => {
        if (categories.includes(totCurr.category)) {
          return totCurr.count + totAcc;
        }
        return totAcc;
      }, 0) ?? 0;
    return acc + currentTotal;
  }, 0);
}

function unionGroupedAlertBatch(b1: GroupedAlertBatch, b2: GroupedAlertBatch | undefined): GroupedAlertBatch | null {
  if (b2 === undefined) {
    return b1;
  }
  if (b1.timestamp !== b2.timestamp) {
    return null;
  }
  const countMap = new Map<AlertCategory, number>();
  b1.counts.forEach((c) => {
    countMap.set(c.category, c.count);
  });
  b2.counts.forEach((c) => {
    const existing = countMap.get(c.category) ?? 0;
    countMap.set(c.category, c.count + existing);
  });
  const categoryKeys = Array.from(new Set([...b1.counts.map((c) => c.category), ...b2.counts.map((c) => c.category)]));
  return {
    timestamp: b1.timestamp,
    counts: categoryKeys.map((ck) => ({
      category: ck,
      count: countMap.get(ck) ?? 0,
    })),
  };
}

function createTimeseriesFieldValues(
  resources: ResourceWithTimeSeriesData[],
  ...validFieldIds: AnomaliesTimeSeriesFieldType[]
): QueryValueSet['timeSeriesFieldValues'] {
  const timeToGroupedBatchMap = new Map<number, GroupedAlertBatch>();
  resources.forEach((resource) => {
    resource.allAnomalyCounts?.timeseries.forEach((ts) => {
      const existing = timeToGroupedBatchMap.get(ts.timestamp);
      const union = unionGroupedAlertBatch(ts, existing);
      if (union) {
        // Should not be possible to be null unless we have misaligned timestamps
        timeToGroupedBatchMap.set(ts.timestamp, union);
      }
    });
  });
  // moves the map to a [key, value][] array.
  const asArray = Array.from(timeToGroupedBatchMap);
  asArray.sort((pair1, pair2) => {
    return pair1[0] - pair2[0];
  });
  // Now that the array is sorted, create an array of values.
  const orderedGroups = asArray.map((item) => item[1]);
  return orderedGroups.map((og) => {
    const values: { [key: string]: number } = {};
    og.counts.forEach((c) => {
      const fieldId = categoryToFieldId(c.category);
      if (fieldId && validFieldIds.includes(fieldId)) {
        values[fieldId] = c.count;
      }
    });
    return {
      timestamp: og.timestamp,
      values,
    };
  });
}

export function useGetAnomalyTimeSeries(primaryId: string, ...fieldIds: string[]): QueryValueSet {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data, loading, error } = useGetResourceAnomaliesTimeSeriesDataQuery({
    variables: {
      ...dateRange,
    },
    skip: loadingDateRange,
  });
  if (primaryId !== MODEL_ANOMALIES_TIME_SERIES && primaryId !== DATASET_ANOMALIES_TIME_SERIES) {
    return INVALID_QVS;
  }
  const resourceFilterFunction = makeResourceFilterFunction(primaryId === MODEL_ANOMALIES_TIME_SERIES);
  const filteredResources = data?.resources.filter((m) => resourceFilterFunction(m.assetCategory)) ?? null;
  const resourceCount = filteredResources?.length ?? null;
  const fieldValues: { [key: string]: number } = {};
  const validFieldIds = getValidFields(primaryId, ...fieldIds);

  const totalAnomalies = filteredResources?.reduce((acc, curr) => {
    const totalForResource =
      curr.allAnomalyCounts?.totals.reduce((totalAcc, totalCurr) => {
        return totalAcc + totalCurr.count;
      }, 0) ?? 0;
    return acc + totalForResource;
  }, 0);
  validFieldIds.forEach((fid) => {
    fieldValues[fid] = 0;
  });
  if (resourceCount === 0) {
    return {
      value: 0,
      fieldValues: {},
      timeSeriesValues: [],
      timeSeriesFieldValues: [],
      loading,
      error,
    };
  }

  if (resourceCount === null || filteredResources === null) {
    return {
      value: null,
      fieldValues: null,
      loading,
      error,
    };
  }

  validFieldIds.forEach((fid) => {
    fieldValues[fid] = countTotalAnomaliesInRangeOfType(filteredResources ?? [], getAnomalyTypeByKey(fid)) ?? 0;
  });

  return {
    value: totalAnomalies ?? null,
    fieldValues,
    timeSeriesFieldValues: createTimeseriesFieldValues(filteredResources, ...validFieldIds),
    loading,
    error,
  };
}
