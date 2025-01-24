import { FeatureSketchFilter, SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { BatchableRequest } from '../../data-utils';

// contains properties which are expected to stay constant within the lifetime of a GraphQL context
// making it possible to group requests by these properties
export type GetFeatureSketchesRequestKey = {
  orgId: string;
  datasetId: string;
  segmentTags: SegmentTag[];
  timePeriod: TimePeriod;
  fromTime: number;
  toTime: number | null;
  histogramSplitPoints?: number[];
  quantileFractions?: number[]; // used by the data service to determine which percentiles to calculate values for. Falls back to an internal default if not specified.
};

export type GetFeatureSketchesRequestBatchableParams = {
  featureName: string;
  metrics: string[];
};

export type FeatureSketchesRequest = {
  key: GetFeatureSketchesRequestKey;
  params: GetFeatureSketchesRequestBatchableParams;
};

export const sketchFilterToFeatures = (filter: FeatureSketchFilter | null): string[] => {
  const { featureName, featureNames } = filter ?? {};
  // if a single feature name is specified, select only that feature, otherwise select all features specified
  return featureName ? [featureName] : featureNames ?? [];
};

interface GetFeatureSketchRequestKey {
  datasetId: string;
  segmentTags: SegmentTag[];
  timePeriod: TimePeriod;
  histogramSplitPoints: number[] | null;
  filter: FeatureSketchFilter | null;
}

interface GetFeatureSketchRequestParams {
  datasetTimestamp: number;
}

export type GetFeatureSketchRequest = GetFeatureSketchRequestKey & GetFeatureSketchRequestParams;

export type GetReferenceSketchesRequest = BatchableRequest<
  GetReferenceSketchesRequestKey,
  GetReferenceSketchesRequestParams
>;

export type GetReferenceSketchesRequestKey = {
  orgId: string;
  datasetId: string;
  segmentTags: SegmentTag[];
  histogramSplitPoints: number[] | null;
  filter: FeatureSketchFilter | null;
};

export type GetReferenceSketchesRequestParams = {
  referenceProfileId: string;
};
