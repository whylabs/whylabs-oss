import { v4 as uuid } from 'uuid';

import { SegmentSummary } from '../../../services/data/data-service/queries/segment-queries';
import { describeTags } from '../../../util/misc';
import { Model, Segment } from '../../generated/graphql';
import { DatasetBaseline } from '../../resolvers/helpers/dataset';

export const dataServiceSegmentToGQL = (
  parentModel: Model,
  baseline: DatasetBaseline,
  druidSegment: SegmentSummary,
): Segment => {
  const segmentTags = druidSegment.segment?.tags;
  if (!segmentTags?.length) {
    throw Error(`Invalid/empty segment in model ${baseline.datasetId}`);
  }
  return {
    id: uuid(),
    datasetId: baseline.datasetId,
    name: describeTags(segmentTags),
    modelId: baseline.datasetId,
    modelName: parentModel.name,
    modelType: parentModel.modelType,
    outputs: baseline.outputs.map((o) => ({ ...o, tags: segmentTags })),
    filteredOutputs: {
      results: [],
      totalCount: 0,
    },
    features: baseline.features.map((f) => ({
      ...f,
      tags: segmentTags,
    })),
    filteredFeatures: {
      results: [],
      totalCount: 0,
    },
    datasetMetrics: [],
    customMetrics: [],
    tags: segmentTags,
    creationTime: parentModel.creationTime,
    batchFrequency: parentModel.batchFrequency,
    batches: [],
    batchDateRanges: [],
    alerts: [],
    events: [],
    // TODO: this is not entirely correct - segment data availability might not match up with overall data availability
    // need to revisit this later
    dataAvailability: baseline.dataAvailability,
    insights: [],
    resourceTags: parentModel.resourceTags,
  };
};
