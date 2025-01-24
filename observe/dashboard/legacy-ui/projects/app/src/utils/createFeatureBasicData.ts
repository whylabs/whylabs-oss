import {
  BaselineFieldsFragment,
  FeatureType,
  GetSegmentedSingleFeatureBasicDataQuery,
  GetSegmentedSingleOutputBasicDataQuery,
  SketchCountFieldsFragment,
} from 'generated/graphql';

export interface FeatureBasicData {
  name: string;
  isValid: boolean;
  inferredType: 'non-discrete' | 'discrete';
  inferredDataType: FeatureType;
  pointsInSpan: number;
  isOutput: boolean;
  startDateOfSpanInMillis?: number;
  endDateOfSpanInMillis?: number;
  loading?: boolean;
}

const INVALID_DATA: FeatureBasicData = {
  name: '',
  isValid: false,
  inferredType: 'discrete',
  inferredDataType: FeatureType.Unknown,
  isOutput: false,
  pointsInSpan: 0,
  startDateOfSpanInMillis: 0,
  endDateOfSpanInMillis: 0,
};

function createFlexibleBasicData(
  data: ({ sketches: Array<SketchCountFieldsFragment> } & BaselineFieldsFragment) | null | undefined,
  isOutput: boolean,
): FeatureBasicData {
  if (data && !data?.schema) {
    return INVALID_DATA;
  }
  if (!data) {
    return {
      ...INVALID_DATA,
      isValid: true,
      loading: true,
    };
  }
  const sortedSketches = data.sketches.slice().sort((a, b) => (a.datasetTimestamp ?? 0) - (b.datasetTimestamp ?? 0));
  const len = sortedSketches.length;
  const [startDate, endDate] =
    len > 0
      ? [sortedSketches[0].datasetTimestamp ?? 0, sortedSketches[len - 1].datasetTimestamp ?? 0]
      : [undefined, undefined];
  return {
    name: data.name,
    isValid: true,
    inferredType: data.schema?.isDiscrete ? 'discrete' : 'non-discrete',
    inferredDataType: data.schema?.inferredType || FeatureType.Unknown,
    isOutput,
    pointsInSpan: len,
    startDateOfSpanInMillis: startDate,
    endDateOfSpanInMillis: endDate,
  };
}

export function createFeatureBasicDataFromOutputs(
  query: GetSegmentedSingleOutputBasicDataQuery | undefined,
): FeatureBasicData {
  return createFlexibleBasicData(query?.model?.segment?.output, true);
}

export function createFeatureBasicDataFromSegments(
  query: GetSegmentedSingleFeatureBasicDataQuery | undefined,
): FeatureBasicData {
  return createFlexibleBasicData(query?.model?.segment?.feature, false);
}
