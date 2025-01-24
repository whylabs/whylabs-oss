import { SegmentRequestScope, SegmentsRequest } from '@whylabs/data-service-node-client';

import { SegmentFilter, SegmentScope, SegmentSort, SegmentTag } from '../../../../graphql/generated/graphql';

export type GetSegmentsRequest = {
  orgId: string;
  datasetId: string;
  filter: SegmentFilter;
  scope?: SegmentScope;
};

export type GetSortedSegmentsRequest = {
  orgId: string;
  sort?: SegmentSort | null;
  filter: SegmentFilter;
  datasetId: string;
  scope?: SegmentScope;
};

export type GetPaginatedSegmentKeysRequest = {
  orgId: string;
  datasetId: string;
  limit: number;
  offset: number;
};

export type SegmentSummary = {
  segment: {
    tags: SegmentTag[];
  };
};

export type SegmentedAnomalyCount = {
  tags: SegmentTag[];
  count: number;
};

const toDataServiceScope = (scope: SegmentScope): SegmentRequestScope => {
  switch (scope) {
    case SegmentScope.Reference:
      return SegmentRequestScope.ReferenceProfile;
    case SegmentScope.Batch:
      return SegmentRequestScope.Timeseries;
    case SegmentScope.Both:
    default:
      return SegmentRequestScope.Both;
  }
};

export const getSegmentTagsQuery = (req: GetSortedSegmentsRequest): SegmentsRequest => {
  const { orgId, datasetId, filter, scope = SegmentScope.Both } = req;
  return {
    orgId,
    datasetId,
    filter: filter.tags ?? [],
    scope: toDataServiceScope(scope),
  };
};
