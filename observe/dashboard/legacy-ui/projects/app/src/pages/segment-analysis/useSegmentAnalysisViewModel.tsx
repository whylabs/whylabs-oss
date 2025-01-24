import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import {
  ACTIVE_COMPARISON,
  METRICS_PRESET,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  SELECTED_COLUMN_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
} from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import {
  MetricSchemaFragment,
  ModelType,
  TimePeriod,
  useGetAvailableMetricsQuery,
  useGetFilteredColumnNamesQuery,
} from 'generated/graphql';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { isValidNumber } from 'utils/typeGuards';
import { usePageTypeWithParams } from '../page-types/usePageType';
import { useResourceContext } from '../model-page/hooks/useResourceContext';
import {
  comparisonDatePickerParams,
  filterCompatibleMetrics,
  findMetricByLabel,
  findPresetForResourceType,
  getPresetMetrics,
  SegmentAnalysisPageConfiguration,
  translateGQLColumnsData,
} from './utils';

type HookReturnType = {
  meta: {
    resourceId: string;
    batchFrequency?: TimePeriod;
    loadingBatchFrequency: boolean;
    resourceType?: ModelType;
    columns: {
      columnsList: { name: string }[];
      isLoadingColumns: boolean;
    };
  };
  metricsData: MetricSchemaFragment[];
  metricsDataLoading: boolean;
  getHeaderControlsState: (
    modelType: ModelType | null,
    metrics: MetricSchemaFragment[],
  ) => SegmentAnalysisPageConfiguration;
  globalDateRange: SimpleDateRange;
  activeComparison: boolean;
  comparisonDateRange: SimpleDateRange | null;
  comparePickerHasFallbackRange: boolean;
};

/*
 * This hook is being copied from dashbird-ui due to iframe limitations,
 * if we fix some bug here, would be a good idea to replicate the code there as well
 * */
export const useSegmentAnalysisViewModel = (): HookReturnType => {
  const { modelId } = usePageTypeWithParams();
  const [searchParams] = useSearchParams();
  const activeComparison = !!searchParams.get(ACTIVE_COMPARISON);
  const {
    resourceState: { resource },
    loading: loadingBatchFrequency,
  } = useResourceContext();
  const { batchFrequency, type: resourceType } = resource ?? {};
  // global date picker
  const { dateRange: globalDateRange } = useSuperGlobalDateRange({
    timePeriod: batchFrequency,
    loading: loadingBatchFrequency,
  });
  // comparison date picker
  const { dateRange: comparisonDateRange, isUsingFallbackRange: comparePickerHasFallbackRange } =
    useSuperGlobalDateRange({
      ...comparisonDatePickerParams,
      timePeriod: batchFrequency,
      loading: loadingBatchFrequency,
    });

  const { data: allMetricsData, loading: metricsDataLoading } = useGetAvailableMetricsQuery({
    variables: { datasetId: modelId, modelType: resourceType },
  });
  const metricsData = useMemo(() => filterCompatibleMetrics(allMetricsData), [allMetricsData]);

  const { data: columnsData, loading: isLoadingColumns } = useGetFilteredColumnNamesQuery({
    variables: { model: modelId, includeFeatures: true, includeOutputs: true, filter: {}, tags: [] },
  });

  const columnsList = useMemo(() => translateGQLColumnsData(columnsData), [columnsData]);

  const getPersistedConfiguration = useCallback(() => {
    return {
      preset: searchParams.get(METRICS_PRESET),
      primaryMetric: searchParams.get(PRIMARY_METRIC),
      secondaryMetric: searchParams.get(SECONDARY_METRIC),
      targetColumn: searchParams.get(SELECTED_COLUMN_QUERY_NAME),
      referenceThreshold: searchParams.get(THRESHOLD_QUERY_NAME),
    };
  }, [searchParams]);

  const getHeaderControlsState = useCallback(
    (modelType: ModelType | null, availableMetrics: MetricSchemaFragment[]): SegmentAnalysisPageConfiguration => {
      const { preset, primaryMetric, secondaryMetric, targetColumn, referenceThreshold } = getPersistedConfiguration();
      const selectedPreset = findPresetForResourceType(preset, modelType, availableMetrics);
      const presetDefaultMetrics = getPresetMetrics(modelType, selectedPreset);
      const usedPrimaryMetricLabel = (() => {
        const usedPrimaryLabel = primaryMetric ?? presetDefaultMetrics?.primary;
        if (usedPrimaryLabel) {
          return findMetricByLabel(availableMetrics, usedPrimaryLabel)?.label;
        }
        return availableMetrics[0]?.label;
      })();
      const usedSecondaryMetricLabel = (() => {
        const usedSecondaryLabel = secondaryMetric ?? presetDefaultMetrics?.secondary;
        if (usedSecondaryLabel) {
          return findMetricByLabel(availableMetrics, usedSecondaryLabel)?.label;
        }
        return availableMetrics[1]?.label;
      })();
      const usedReferenceThreshold = (() => {
        if (referenceThreshold && isValidNumber(Number(referenceThreshold))) {
          return Number(referenceThreshold);
        }
        return null;
      })();
      return {
        selectedPreset,
        referenceThreshold: usedReferenceThreshold,
        primaryMetric: usedPrimaryMetricLabel ?? null,
        secondaryMetric: usedSecondaryMetricLabel ?? null,
        targetColumn: targetColumn || columnsList?.[0]?.name || null,
      };
    },
    [columnsList, getPersistedConfiguration],
  );

  const usedComparisonDateRange = (() => {
    if (activeComparison) return comparisonDateRange;
    return null;
  })();

  return {
    meta: {
      resourceId: modelId,
      batchFrequency,
      loadingBatchFrequency,
      resourceType,
      columns: {
        columnsList,
        isLoadingColumns,
      },
    },
    metricsData,
    metricsDataLoading,
    getHeaderControlsState,
    globalDateRange,
    activeComparison,
    comparisonDateRange: usedComparisonDateRange,
    comparePickerHasFallbackRange,
  };
};
