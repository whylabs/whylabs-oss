import {
  GetMissingValuesForFeatureQuery,
  GetMissingValuesForOutputFeatureQuery,
  GetMissingValuesForSegmentedFeatureQuery,
  GetMissingValuesForSegmentOutputFeatureQuery,
  useGetMissingAnalysisQuery,
  useGetMissingValuesForFeatureQuery,
  useGetMissingValuesForOutputFeatureQuery,
  useGetMissingValuesForSegmentedFeatureQuery,
  useGetMissingValuesForSegmentOutputFeatureQuery,
} from 'generated/graphql';
import { MissingValue } from 'utils/createMissingValues';
import { Maybe } from 'graphql/jsutils/Maybe';
import { MonitoringPageType } from '../vizutils/dataUtils';

type GetMissingValuesTypes = {
  HookType:
    | typeof useGetMissingValuesForFeatureQuery
    | typeof useGetMissingValuesForSegmentedFeatureQuery
    | typeof useGetMissingValuesForOutputFeatureQuery
    | typeof useGetMissingValuesForSegmentOutputFeatureQuery;
  ReturnType?:
    | GetMissingValuesForSegmentedFeatureQuery
    | GetMissingValuesForFeatureQuery
    | GetMissingValuesForOutputFeatureQuery
    | GetMissingValuesForSegmentOutputFeatureQuery;
};

interface QueriesObj {
  getAnalysisData: typeof useGetMissingAnalysisQuery;
  getValueData: GetMissingValuesTypes['HookType'];
}
export const getThresholdQueriesByPageType = (pageType: MonitoringPageType): QueriesObj => {
  const queriesByPageType = new Map<MonitoringPageType, QueriesObj>([
    [
      'feature',
      {
        getAnalysisData: useGetMissingAnalysisQuery,
        getValueData: useGetMissingValuesForFeatureQuery,
      },
    ],
    [
      'segmentFeature',
      {
        getAnalysisData: useGetMissingAnalysisQuery,
        getValueData: useGetMissingValuesForSegmentedFeatureQuery,
      },
    ],
    [
      'outputFeature',
      {
        getAnalysisData: useGetMissingAnalysisQuery,
        getValueData: useGetMissingValuesForOutputFeatureQuery,
      },
    ],
    [
      'segmentOutputFeature',
      {
        getAnalysisData: useGetMissingAnalysisQuery,
        getValueData: useGetMissingValuesForSegmentOutputFeatureQuery,
      },
    ],
  ]);

  return queriesByPageType.get(pageType)!;
};

interface TranslateMissingValues {
  data: GetMissingValuesTypes['ReturnType'];
  isOutput: boolean;
  isSegment: boolean;
}
type MissingValuesSketch = {
  id: string;
  datasetTimestamp?: Maybe<number>;
  lastUploadTimestamp?: Maybe<number>;
  totalCount: number;
  nullCount: number;
  nullRatio: number;
};
export const getMissingValuesSketches = ({
  data,
  isOutput,
  isSegment,
}: TranslateMissingValues): MissingValuesSketch[] => {
  if (!data) return [];
  let feature;
  if (isOutput) {
    feature = isSegment
      ? (data as GetMissingValuesForSegmentOutputFeatureQuery).model?.segment?.output
      : (data as GetMissingValuesForOutputFeatureQuery).model?.output;
  } else {
    feature = isSegment
      ? (data as GetMissingValuesForSegmentedFeatureQuery).model?.segment?.feature
      : (data as GetMissingValuesForFeatureQuery).model?.feature;
  }
  return feature?.sketches ?? [];
};

export function translateMissingValues({ data, isOutput, isSegment }: TranslateMissingValues): MissingValue[] {
  const sketches = getMissingValuesSketches({ data, isOutput, isSegment });
  return (
    sketches
      ?.map((sketch) => ({
        dateInMillis: sketch.datasetTimestamp ?? 0,
        lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined,
        totalCount: sketch.totalCount,
        nullCount: sketch.nullCount,
        nullRatio: sketch.nullRatio,
      }))
      .sort((a, b) => a.dateInMillis - b.dateInMillis) || []
  );
}
