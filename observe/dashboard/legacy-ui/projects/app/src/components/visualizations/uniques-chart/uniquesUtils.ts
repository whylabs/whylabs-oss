import {
  GetUniqueSummariesForSegmentedFeatureQuery,
  GetUniqueSummariesForSegmentedOutputQuery,
  UniqueSketchFieldsFragment,
  useGetUniqueAnalysisQuery,
  useGetUniqueSummariesForSegmentedFeatureQuery,
  useGetUniqueSummariesForSegmentedOutputQuery,
} from 'generated/graphql';
import { UniqueValue } from 'utils/createUniqueValues';
import { DatedUniqueSummary, isValidUniqueCountSummary } from 'utils/createDatedUniqueSummaries';
import { MonitoringPageType } from '../vizutils/dataUtils';

type GetUniqueSummariesTypes = {
  HookType: typeof useGetUniqueSummariesForSegmentedFeatureQuery | typeof useGetUniqueSummariesForSegmentedOutputQuery;
  ReturnType?: GetUniqueSummariesForSegmentedFeatureQuery | GetUniqueSummariesForSegmentedOutputQuery;
};

interface QueriesObj {
  getAnalysisData: typeof useGetUniqueAnalysisQuery;
  getValueData: GetUniqueSummariesTypes['HookType'];
}
export const getUniqueValuesQueriesByPageType = (pageType: MonitoringPageType): QueriesObj => {
  const queriesByPageType = new Map<MonitoringPageType, QueriesObj>([
    [
      'feature',
      {
        getAnalysisData: useGetUniqueAnalysisQuery,
        getValueData: useGetUniqueSummariesForSegmentedFeatureQuery,
      },
    ],
    [
      'segmentFeature',
      {
        getAnalysisData: useGetUniqueAnalysisQuery,
        getValueData: useGetUniqueSummariesForSegmentedFeatureQuery,
      },
    ],
    [
      'outputFeature',
      {
        getAnalysisData: useGetUniqueAnalysisQuery,
        getValueData: useGetUniqueSummariesForSegmentedOutputQuery,
      },
    ],
    [
      'segmentOutputFeature',
      {
        getAnalysisData: useGetUniqueAnalysisQuery,
        getValueData: useGetUniqueSummariesForSegmentedOutputQuery,
      },
    ],
  ]);

  return queriesByPageType.get(pageType)!;
};

interface TranslateUniquenessValues {
  data: GetUniqueSummariesTypes['ReturnType'];
  isOutput: boolean;
}

interface UniquenessSketches {
  sketches?: UniqueSketchFieldsFragment[];
  isDiscrete?: boolean;
}
export const getUniquenessSketches = ({ data, isOutput }: TranslateUniquenessValues): UniquenessSketches => {
  if (!data) return {};
  const feature = isOutput
    ? (data as GetUniqueSummariesForSegmentedOutputQuery).model?.segment?.output
    : (data as GetUniqueSummariesForSegmentedFeatureQuery).model?.segment?.feature;

  return {
    sketches: feature?.sketches,
    isDiscrete: !!feature?.schema?.isDiscrete,
  };
};

export function translateUniquenessValues({ data, isOutput }: TranslateUniquenessValues): UniqueValue[] {
  const sketches = getUniquenessSketches({ data, isOutput }).sketches ?? [];
  return (
    sketches
      .reduce((filteredSketches, sketch) => {
        if (sketch.uniqueCount && isValidUniqueCountSummary(sketch.uniqueCount)) {
          filteredSketches.push({
            dateInMillis: sketch.datasetTimestamp ?? 0,
            lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined,
            estimate: sketch.uniqueCount.estimate as number,
            upper: sketch.uniqueCount.upper as number,
            lower: sketch.uniqueCount.lower as number,
            ratio: sketch.uniqueRatio as number,
          });
        }
        return filteredSketches;
      }, [] as DatedUniqueSummary[])
      .sort((a, b) => a.dateInMillis - b.dateInMillis) || []
  );
}
