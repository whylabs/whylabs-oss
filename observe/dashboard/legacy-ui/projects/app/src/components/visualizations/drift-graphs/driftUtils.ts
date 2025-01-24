import {
  BaselineFieldsFragment,
  FrequentItemsFieldsFragment,
  GetFrequentItemsForSegmentedFeatureQuery,
  GetFrequentItemsForSegmentedOutputQuery,
  GetQuantileSummariesForSegmentedFeatureQuery,
  GetQuantileSummariesForSegmentedOutputQuery,
  GetSegmentedFeatureBasicDataQuery,
  GetSegmentedOutputBasicDataQuery,
  QuantileSummaryFieldsFragment,
  useGetDriftAnalysisQuery,
  useGetFrequentItemsForSegmentedFeatureQuery,
  useGetFrequentItemsForSegmentedOutputQuery,
  useGetQuantileSummariesForSegmentedFeatureQuery,
  useGetQuantileSummariesForSegmentedOutputQuery,
  useGetSegmentedFeatureBasicDataQuery,
  useGetSegmentedOutputBasicDataQuery,
} from 'generated/graphql';
import { createFlexibleDatedFrequentItems, DatedFrequentItem } from 'utils/createDatedFrequentItems';
import { createFlexibleDatedQuantiles, DatedQuantileSummary } from 'utils/createDatedQuantiles';
import { MonitoringPageType } from '../vizutils/dataUtils';

type GetBasicDataTypes = {
  HookType: typeof useGetSegmentedFeatureBasicDataQuery | typeof useGetSegmentedOutputBasicDataQuery;
  ReturnType?: GetSegmentedFeatureBasicDataQuery | GetSegmentedOutputBasicDataQuery;
};

type GetFrequentItemsDataTypes = {
  HookType: typeof useGetFrequentItemsForSegmentedFeatureQuery | typeof useGetFrequentItemsForSegmentedOutputQuery;
  ReturnType?: GetFrequentItemsForSegmentedFeatureQuery | GetFrequentItemsForSegmentedOutputQuery;
};

type GetQuantileDataTypes = {
  HookType:
    | typeof useGetQuantileSummariesForSegmentedFeatureQuery
    | typeof useGetQuantileSummariesForSegmentedOutputQuery;
  ReturnType?: GetQuantileSummariesForSegmentedFeatureQuery | GetQuantileSummariesForSegmentedOutputQuery;
};

interface QueriesObj {
  getAnalysisData: typeof useGetDriftAnalysisQuery;
  getBasicData: GetBasicDataTypes['HookType'];
  getFrequentItemsData: GetFrequentItemsDataTypes['HookType'];
  getQuantileData: GetQuantileDataTypes['HookType'];
}
export const getDriftQueriesByPageType = (pageType: MonitoringPageType): QueriesObj => {
  const queriesByPageType = new Map<MonitoringPageType, QueriesObj>([
    [
      'feature',
      {
        getAnalysisData: useGetDriftAnalysisQuery,
        getBasicData: useGetSegmentedFeatureBasicDataQuery,
        getFrequentItemsData: useGetFrequentItemsForSegmentedFeatureQuery,
        getQuantileData: useGetQuantileSummariesForSegmentedFeatureQuery,
      },
    ],
    [
      'segmentFeature',
      {
        getAnalysisData: useGetDriftAnalysisQuery,
        getBasicData: useGetSegmentedFeatureBasicDataQuery,
        getFrequentItemsData: useGetFrequentItemsForSegmentedFeatureQuery,
        getQuantileData: useGetQuantileSummariesForSegmentedFeatureQuery,
      },
    ],
    [
      'outputFeature',
      {
        getAnalysisData: useGetDriftAnalysisQuery,
        getBasicData: useGetSegmentedOutputBasicDataQuery,
        getFrequentItemsData: useGetFrequentItemsForSegmentedOutputQuery,
        getQuantileData: useGetQuantileSummariesForSegmentedOutputQuery,
      },
    ],
    [
      'segmentOutputFeature',
      {
        getAnalysisData: useGetDriftAnalysisQuery,
        getBasicData: useGetSegmentedOutputBasicDataQuery,
        getFrequentItemsData: useGetFrequentItemsForSegmentedOutputQuery,
        getQuantileData: useGetQuantileSummariesForSegmentedOutputQuery,
      },
    ],
  ]);

  return queriesByPageType.get(pageType)!;
};

interface TranslateFrequentItems {
  data: GetFrequentItemsDataTypes['ReturnType'];
  isOutput: boolean;
}

export const getFrequentItemsSketches = ({ data, isOutput }: TranslateFrequentItems): FrequentItemsFieldsFragment[] => {
  if (!data) return [];
  const feature = isOutput
    ? (data as GetFrequentItemsForSegmentedOutputQuery).model?.segment?.output
    : (data as GetFrequentItemsForSegmentedFeatureQuery).model?.segment?.feature;
  return feature?.sketches ?? [];
};

export const getQuantileSketches = ({ data, isOutput }: TranslateQuantiles): QuantileSummaryFieldsFragment[] => {
  if (!data) return [];
  const feature = isOutput
    ? (data as GetQuantileSummariesForSegmentedOutputQuery).model?.segment?.output
    : (data as GetQuantileSummariesForSegmentedFeatureQuery).model?.segment?.feature;
  return feature?.sketches ?? [];
};

interface TranslateBasicData {
  data: GetBasicDataTypes['ReturnType'];
  isOutput: boolean;
}

export const translateBasicData = ({ data, isOutput }: TranslateBasicData): BaselineFieldsFragment | null => {
  if (!data) return null;
  const feature = isOutput
    ? (data as GetSegmentedOutputBasicDataQuery).model?.segment?.output
    : (data as GetSegmentedFeatureBasicDataQuery).model?.segment?.feature;
  return feature ?? null;
};

interface TranslateQuantiles {
  data: GetQuantileDataTypes['ReturnType'];
  isOutput: boolean;
}

export function translateFrequentItems({ data, isOutput }: TranslateFrequentItems): DatedFrequentItem[] {
  const sketches = getFrequentItemsSketches({ data, isOutput });
  return createFlexibleDatedFrequentItems({ sketches });
}

export function translateQuantiles({ data, isOutput }: TranslateQuantiles): DatedQuantileSummary[] {
  const sketches = getQuantileSketches({ data, isOutput });
  return createFlexibleDatedQuantiles({ sketches });
}
