import { MaxIORow, MaxIORowSegmented } from '@whylabs/data-service-node-client';
import { sortBy } from 'lodash';

import { BatchMetadata, SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { tagsToDataServiceSegment } from '../../data-service/data-service-utils';

type IOCount = Pick<BatchMetadata, 'inputCount' | 'outputCount'>;
type PartialMaxIORow = Pick<MaxIORow, 'maxCount' | 'isOutput' | 'timestamp'>;
type IOCountByTimestamp = Map<number, IOCount>;

export const convertToGQLBatchMetadata = (
  ioCount: IOCount,
  datasetId: string,
  tags: SegmentTag[],
  timestamp: number,
  timePeriod: TimePeriod,
): BatchMetadata => {
  const { inputCount, outputCount } = ioCount;
  return {
    inputCount,
    outputCount,
    datasetId,
    tags,
    timestamp,
    batchFrequency: timePeriod,
    metrics: {},
    sketches: {
      totalDiscrete: 0,
      totalNonDiscrete: 0,
      totalCount: 0,
      results: [],
    },
  };
};

const updateCountsByTimestamp = (countsByTimestamp: IOCountByTimestamp, result: PartialMaxIORow) => {
  const timestamp = result.timestamp ?? 0;
  const defaultIOCounts: IOCount = { inputCount: 0, outputCount: 0 };
  const counts = countsByTimestamp.get(timestamp) ?? defaultIOCounts;
  if (result.isOutput) {
    counts.outputCount = result.maxCount ?? 0;
  } else {
    counts.inputCount = result.maxCount ?? 0;
  }
  countsByTimestamp.set(timestamp, counts);
  return countsByTimestamp;
};

export const convertToSegmentedBatchMetadata = (
  results: MaxIORowSegmented[],
  expectedSegments: SegmentTag[][],
  datasetId: string,
  timePeriod: TimePeriod,
): BatchMetadata[] => {
  const resultsBySegment = new Map<string, IOCountByTimestamp>();
  results.forEach((result) => {
    const segment = tagsToDataServiceSegment(result.tags);
    const countsByTimestamp = updateCountsByTimestamp(
      resultsBySegment.get(segment) ?? new Map<number, IOCount>(),
      result,
    );
    resultsBySegment.set(segment, countsByTimestamp);
  });

  // now we need to reconcile the segment strings with the expected segments and convert to batch metadata
  const metadata: BatchMetadata[] = [];
  expectedSegments.forEach((segment) => {
    const segmentString = tagsToDataServiceSegment(segment);
    const segmentResults = resultsBySegment.get(segmentString);
    if (segmentResults) {
      for (const [timestamp, ioCount] of segmentResults.entries()) {
        metadata.push(convertToGQLBatchMetadata(ioCount, datasetId, segment, timestamp, timePeriod));
      }
    }
  });
  return sortBy(metadata, ['timestamp']);
};

export const convertToBatchMetadata = (
  results: MaxIORow[],
  segment: SegmentTag[],
  datasetId: string,
  timePeriod: TimePeriod,
): BatchMetadata[] => {
  const countsByTimestamp = new Map<number, IOCount>();
  results.forEach((result) => {
    updateCountsByTimestamp(countsByTimestamp, result);
  });
  const metadata: BatchMetadata[] = [];
  for (const [timestamp, ioCount] of countsByTimestamp.entries()) {
    metadata.push(convertToGQLBatchMetadata(ioCount, datasetId, segment, timestamp, timePeriod));
  }
  return sortBy(metadata, ['timestamp']);
};
