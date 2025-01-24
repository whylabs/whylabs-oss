import {
  DATASET_COUNT_KEY,
  INVALID_QVS,
  MODEL_COUNT_KEY,
  QueryValueSet,
  isResourceKeyFieldType,
  ModelPercPrimaryType,
  MODEL_PERC_PRIMARY_KEYS,
  DatasetPercPrimaryType,
  DATASET_PERC_PRIMARY_KEYS,
  MODEL_ANOMALIES_TIME_SERIES,
  DATASET_TOTAL_RECORDS_YESTERDAY,
  MODEL_INPUT_BATCHES_TIME_SERIES,
  DATASET_INPUT_BATCHES_TIME_SERIES,
  DATASET_ANOMALIES_TIME_SERIES,
  MONITORING_COVERAGE_KEY,
  MONITORING_COVERAGE_DATASET_ONLY,
  MONITORING_COVERAGE_MODEL_ONLY,
} from '../query-handlers/types';
import { useGetAnomalyTimeSeries } from './useGetAnomalyTimeSeries';
import { useGetAnomalyPercentages } from './useGetAnomalyPercentages';
import { useGetResourceClassificationInformation } from './useGetResourceClassificationInformation';
import { useGetBatchesCounts } from './useGetBatchesCounts';
import { useGetBatchesCountTimeSeries } from './useGetBatchesCountTimeSeries';
import { useGetMonitoringCoveragePercentages } from './useGetMonitoringCoveragePercentages';

type CardQueryHook = (primaryId: string, ...fieldIds: string[]) => QueryValueSet;

const INVALID_HOOK: CardQueryHook = () => INVALID_QVS;

const queryMapper = new Map<string, CardQueryHook>([
  [MODEL_COUNT_KEY, useGetResourceClassificationInformation],
  [DATASET_COUNT_KEY, useGetResourceClassificationInformation],
  [MONITORING_COVERAGE_KEY, useGetMonitoringCoveragePercentages],
  [MONITORING_COVERAGE_DATASET_ONLY, useGetMonitoringCoveragePercentages],
  [MONITORING_COVERAGE_MODEL_ONLY, useGetMonitoringCoveragePercentages],
  [MODEL_ANOMALIES_TIME_SERIES, useGetAnomalyTimeSeries],
  [DATASET_ANOMALIES_TIME_SERIES, useGetAnomalyTimeSeries],
  [DATASET_TOTAL_RECORDS_YESTERDAY, useGetBatchesCounts],
  [MODEL_INPUT_BATCHES_TIME_SERIES, useGetBatchesCountTimeSeries],
  [DATASET_INPUT_BATCHES_TIME_SERIES, useGetBatchesCountTimeSeries],
]);

export function useGetQueryByIds(primaryId: string): CardQueryHook {
  const queryHook = queryMapper.get(primaryId);
  if (queryHook) {
    return queryHook;
  }
  const isModel = isResourceKeyFieldType<ModelPercPrimaryType>(primaryId, MODEL_PERC_PRIMARY_KEYS);
  const isDataset = isResourceKeyFieldType<DatasetPercPrimaryType>(primaryId, DATASET_PERC_PRIMARY_KEYS);
  if (!isModel && !isDataset) {
    return INVALID_HOOK;
  }
  return useGetAnomalyPercentages;
}
