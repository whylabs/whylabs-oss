import {
  SegmentTagFilter,
  useGetAllFilteredFeaturesOutputMetricNamesQuery,
  useGetSegmentedFilteredFeaturesQuery,
} from 'generated/graphql';
import { useEffect, useState, useReducer, useCallback, useMemo } from 'react';
import { columnListReducer } from 'reducers/ColumnListReducers';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

export const FEATURE_LIST_LIMIT = 100;

type UseLoadMoreFeaturesReturnType = {
  loading: boolean;
  hasMoreFeatures: boolean;
  loadMoreFeaturesHandler: () => void;
  loadMoreOutputsHandler: () => void;
  hasMoreOutputs: boolean;
  featureList: string[];
  metricList: string[];
  outputList: string[];
  setFeatureList: (featuresToAdd: string[]) => void;
  setMetricList: React.Dispatch<React.SetStateAction<string[]>>;
  setOutputList: (outputsToAdd: string[]) => void;
  reset: () => void;
};

const offsetsDefaultState = {
  hasMoreFeatures: true,
  hasMoreOutputs: true,
  featuresOffset: 0,
  outputsOffset: 0,
};

export default function useLoadMoreFeatures(
  modelId: string,
  tags: SegmentTagFilter[] | undefined,
): UseLoadMoreFeaturesReturnType {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const [featureList, updateFeatureList] = useReducer(columnListReducer, []);
  const [metricList, setMetricList] = useState<string[]>([]);
  const [outputList, updateOutputList] = useReducer(columnListReducer, []);
  const [offsetsState, setOffsetsState] = useState(offsetsDefaultState);

  const loadMoreFeaturesHandler = () =>
    setOffsetsState((curr) => ({ ...curr, featuresOffset: curr.featuresOffset + FEATURE_LIST_LIMIT }));
  const loadMoreOutputsHandler = () =>
    setOffsetsState((curr) => ({ ...curr, outputsOffset: curr.outputsOffset + FEATURE_LIST_LIMIT }));

  const usedQueryHook = tags?.length
    ? useGetSegmentedFilteredFeaturesQuery
    : useGetAllFilteredFeaturesOutputMetricNamesQuery;
  const { data: allFeaturesMetricsOutputs, loading } = usedQueryHook({
    variables: {
      modelId,
      featuresOffset: offsetsState.featuresOffset,
      outputsOffset: offsetsState.outputsOffset,
      limit: FEATURE_LIST_LIMIT,
      featureFilter: {},
      tags,
      ...dateRange,
    },
    skip: !modelId || loadingDateRange,
  });

  const usedFetchedData = useMemo(() => {
    const modelData = allFeaturesMetricsOutputs?.model;
    if (!modelData) return undefined;
    if ('segment' in modelData) {
      return modelData.segment;
    }
    if ('filteredFeatures' in modelData) {
      return modelData;
    }
    return undefined;
  }, [allFeaturesMetricsOutputs?.model]);

  function setFeatureList(featuresToAdd: string[]) {
    updateFeatureList({ actionType: 'add', data: featuresToAdd });
  }

  function setOutputList(outputsToAdd: string[]) {
    updateOutputList({ actionType: 'add', data: outputsToAdd });
  }

  /**
   * Sets all state to default
   */
  const reset = useCallback(() => {
    setMetricList([]);
    setOffsetsState(offsetsDefaultState);
    updateOutputList({ actionType: 'clear' });
    updateFeatureList({ actionType: 'clear' });
  }, []);

  useEffect(() => {
    const features = usedFetchedData?.filteredFeatures?.results;
    const outputs = usedFetchedData?.filteredOutputs?.results;
    const metrics = usedFetchedData?.datasetMetrics;

    if (features) {
      const featureNameMap = features.map((feature) => feature.name).sort();
      updateFeatureList({ actionType: 'add', data: featureNameMap });
      if (features.length < FEATURE_LIST_LIMIT) setOffsetsState((curr) => ({ ...curr, hasMoreFeatures: false }));
    }
    if (outputs) {
      const outputNameMap = outputs.map((output) => output.name).sort();
      updateOutputList({ actionType: 'add', data: outputNameMap });
      if (outputs.length < FEATURE_LIST_LIMIT) setOffsetsState((curr) => ({ ...curr, hasMoreOutputs: false }));
    }
    if (metrics) setMetricList([...metrics.map((metric) => metric.name)].sort()); // We are not saving previous metrics since we fetch every
  }, [
    allFeaturesMetricsOutputs,
    usedFetchedData?.datasetMetrics,
    usedFetchedData?.filteredFeatures?.results,
    usedFetchedData?.filteredOutputs?.results,
  ]);

  return {
    loading,
    hasMoreFeatures: offsetsState.hasMoreFeatures,
    loadMoreFeaturesHandler,
    hasMoreOutputs: offsetsState.hasMoreOutputs,
    loadMoreOutputsHandler,
    featureList,
    metricList,
    outputList,
    setFeatureList,
    setMetricList,
    setOutputList,
    reset,
  };
}
