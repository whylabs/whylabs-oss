import { TimePeriod } from 'generated/graphql';
import { NullishString } from 'types/genericTypes';
import { utcFormat } from 'd3-time-format';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import { Granularity } from 'generated/monitor-schema';
import { isExactlyNullOrUndefined } from './nullUtils';

export function isTimePeriod(key: NullishString): key is TimePeriod {
  if (!key) return false;
  return Object.values(TimePeriod).includes(key as TimePeriod);
}

function getDefaultDisplay(
  formatter: (date: Date) => string,
  minTimeWidth: number,
  timestamp: number,
  endTimestamp?: number,
): string {
  const defaultStart = formatter(new Date(timestamp));
  if (isExactlyNullOrUndefined(endTimestamp)) {
    return defaultStart;
  }
  // Because the end timestamp is exclusive, we subtract 1 millisecond to get the last millisecond of the previous batch
  const defaultEnd = formatter(new Date(endTimestamp - 1));
  if (defaultStart === defaultEnd || endTimestamp - timestamp <= minTimeWidth) {
    return defaultStart;
  }
  return `${defaultStart} to ${defaultEnd}`;
}

export function getTooltipTimeDisplay(timestamp: number, endTimestamp?: number, batchFrequency?: TimePeriod): string {
  const yearMonthDayFormatter = utcFormat('%Y-%m-%d');
  const defaultDisplay = getDefaultDisplay(yearMonthDayFormatter, ONE_DAY_IN_MILLIS, timestamp, endTimestamp);
  if (!batchFrequency || batchFrequency === TimePeriod.P1D) {
    return defaultDisplay;
  }
  if (batchFrequency === TimePeriod.Pt1H) {
    return utcFormat('%m-%d %H:%M')(new Date(timestamp));
  }
  if (batchFrequency === TimePeriod.P1M) {
    return utcFormat('%Y-%m-%d')(new Date(timestamp));
  }
  return defaultDisplay;
}

export const mapTimePeriodToGranularityString = new Map<TimePeriod, Granularity>([
  [TimePeriod.Pt1H, 'hourly'],
  [TimePeriod.P1D, 'daily'],
  [TimePeriod.P1W, 'weekly'],
  [TimePeriod.P1M, 'monthly'],
]);

export function granularityToTimePeriod(granularity?: Granularity): TimePeriod | undefined {
  if (!granularity) return undefined;
  switch (granularity) {
    case 'hourly':
      return TimePeriod.Pt1H;
    case 'daily':
      return TimePeriod.P1D;
    case 'weekly':
      return TimePeriod.P1W;
    case 'monthly':
      return TimePeriod.P1M;
    default:
      return undefined;
  }
}
