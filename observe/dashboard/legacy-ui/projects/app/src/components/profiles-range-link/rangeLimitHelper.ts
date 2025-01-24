import { AssetCategory, TimePeriod } from 'generated/graphql';
import { getBatchStep } from 'utils/timeUtils';
import { handleEndTimestampRounding } from '../super-date-picker/utils';

type GetValidRangeOutputType = {
  range: [number, number] | null;
  truncatedRange: [number, string] | null;
  tooltip: string;
};

const MAX_ALLOWABLE_HOURLY_BUCKETS = 7 * 24; // at most one week of hourly buckets
const MAX_ALLOWABLE_DAILY_BUCKETS = 6 * 30; // approximately six months of daily buckets
const RESTRICTED_BATCH_TYPES: TimePeriod[] = [TimePeriod.P1D, TimePeriod.Pt1H];
type RestrictedBatchType = typeof RESTRICTED_BATCH_TYPES[number];

function isRestrictedBatchType(batchFrequency: TimePeriod): batchFrequency is RestrictedBatchType {
  return RESTRICTED_BATCH_TYPES.includes(batchFrequency);
}

function getAssetCategoryString(assetCategory: AssetCategory | null): string {
  switch (assetCategory) {
    case AssetCategory.Data:
      return 'dataset';
    case AssetCategory.Model:
      return 'model';
    case AssetCategory.Llm:
      return 'LLM';
    default:
      return 'resource';
  }
}

export const getBatchDaysLimitToTimePeriod = (timePeriod?: TimePeriod): number | null => {
  switch (timePeriod) {
    case TimePeriod.Pt1H:
      return MAX_ALLOWABLE_HOURLY_BUCKETS / 24;
    case TimePeriod.P1D:
      return MAX_ALLOWABLE_DAILY_BUCKETS;
    default:
      return null;
  }
};

function getStandardTooltip(assetCategory: AssetCategory | null, shortVersion = false): string {
  if (shortVersion) return 'Click to view the full profile lineage';
  return `Click to view the full profile lineage for this ${getAssetCategoryString(assetCategory)}`;
}

const getTruncatedRange = (batchFrequency: RestrictedBatchType): [number, string] => {
  const numberOfDays = getBatchDaysLimitToTimePeriod(batchFrequency) ?? MAX_ALLOWABLE_DAILY_BUCKETS;
  return [numberOfDays, 'days'];
};

function getTruncatedTooltip(
  assetCategory: AssetCategory | null,
  batchFrequency: RestrictedBatchType,
  shortVersion = false,
): string {
  const [numberString, unitString] = getTruncatedRange(batchFrequency);
  if (shortVersion) return `Click to view the last ${numberString} ${unitString} of data`;
  return `Click to view the last ${numberString} ${unitString} of data for this ${getAssetCategoryString(
    assetCategory,
  )}`;
}

export function getUsableRangeAndTooltip(
  batchFrequency: TimePeriod | null | undefined,
  range: [number, number] | null,
  assetCategory: AssetCategory | null,
  shouldTruncateRangeIfNeeded: boolean,
  shortTooltip = false,
): GetValidRangeOutputType {
  if (!batchFrequency || !range) {
    return { range, tooltip: '', truncatedRange: null };
  }

  const [from, to] = range;
  const endOfBucketTimestamp = handleEndTimestampRounding(to);
  const bucketDivisorInMillis = getBatchStep(batchFrequency);
  // Not possible, but not prevented by this function
  if (bucketDivisorInMillis === 0) {
    return { range, tooltip: '', truncatedRange: null };
  }

  if (!isRestrictedBatchType(batchFrequency) || !shouldTruncateRangeIfNeeded) {
    return {
      range,
      tooltip: getStandardTooltip(assetCategory, shortTooltip),
      truncatedRange: null,
    };
  }

  const approximateBucketCount = Math.floor((endOfBucketTimestamp - from) / bucketDivisorInMillis);
  const usedMax = batchFrequency === TimePeriod.P1D ? MAX_ALLOWABLE_DAILY_BUCKETS : MAX_ALLOWABLE_HOURLY_BUCKETS;
  const isTruncated = approximateBucketCount > usedMax;
  return {
    range: isTruncated ? [endOfBucketTimestamp - usedMax * bucketDivisorInMillis, to] : range,
    truncatedRange: isTruncated ? getTruncatedRange(batchFrequency) : null,
    tooltip: isTruncated
      ? getTruncatedTooltip(assetCategory, batchFrequency, shortTooltip)
      : getStandardTooltip(assetCategory, shortTooltip),
  };
}
