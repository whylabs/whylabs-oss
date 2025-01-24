import { ColumnAndMetricAnalysisFragment, TimePeriod } from 'generated/graphql';
import { getUTCEndOfDay, getUTCStartOfDay, SimpleDateRange } from 'utils/dateRangeUtils';
import { ONE_DAY_IN_MILLIS, ONE_HOUR_IN_MILLIS, ONE_WEEK_IN_MILLIS } from 'ui/constants';
import { TimeRange } from 'utils/dateUtils';
import { getFunctionsForTimePeriod, openEndDateRangeTransformer } from 'utils/batchProfileUtils';

export type SummaryTimeRanges = {
  shortRange: TimeRange;
  midRange: TimeRange;
  globalDateRange: TimeRange;
  batchFrequency: TimePeriod;
};

export function getMidRangeFromBatchFrequencyAndShortRange(
  shortRange: TimeRange, // This range is assumed to be started on our schedule (1st of week / month / always UTC time)
  batchFrequency: TimePeriod,
): TimeRange {
  const timeRange = { ...shortRange };
  const fromDate = new Date(timeRange.from);
  // Note that because we want this to overlap with the short range, it is one less "step back" in the TimeRange.from
  // than you might otherwise be expecting.
  switch (batchFrequency) {
    case TimePeriod.Pt1H:
      timeRange.from = timeRange.from - ONE_DAY_IN_MILLIS + ONE_HOUR_IN_MILLIS;
      break;
    case TimePeriod.P1W:
      timeRange.from -= 3 * ONE_WEEK_IN_MILLIS;
      break;
    case TimePeriod.P1M:
      timeRange.from = getUTCStartOfDay(new Date(fromDate.getUTCFullYear(), fromDate.getUTCMonth() - 2, 1)).getTime(); // Have to do monthly arithmetic
      break;
    default:
      timeRange.from -= 6 * ONE_DAY_IN_MILLIS; // one week plus one day
  }
  return timeRange;
}

/**
 * Gets the beginning and the end of the day prior to the supplied timestamp.
 * The resulting timestamps only change at midnight.
 * @param dateRange
 */
type PrevBatchTimestampsReturnType = {
  prevBatchStartTimestamp: number;
  prevBatchEndTimestamp: number;
  globalDayStartTimestamp: number;
  globalDayEndTimestamp: number;
};

function getPrevDayTimestamps(endTimeMillis: number): TimeRange {
  // Note: these values are potentially dangerous because they can change every millisecond.
  // Effects depending on them can cause the memo to be reloaded constantly.
  const dangerousDayAgoTime = endTimeMillis - ONE_DAY_IN_MILLIS;

  // We define "previous day" as the last, full 24 hour period in UTC time, rather than the time period between now and 24 hours ago
  // this is useful for daily datasets, because the daily monitor runs produce anomalies for the previous UTC midnight, so there would
  // never be any anomalies in the last 24 hours.
  const startOfPreviousDay = getUTCStartOfDay(new Date(dangerousDayAgoTime));

  const endOfPreviousDay = getUTCEndOfDay(new Date(dangerousDayAgoTime));

  return {
    from: startOfPreviousDay.getTime(),
    to: endOfPreviousDay.getTime(),
  };
}

function getPrevWeekTimestamps(endTimeMillis: number): TimeRange {
  // Note: these values are potentially dangerous because they can change every millisecond.
  // Effects depending on them can cause the memo to be reloaded constantly.
  const dangerousWeekAgo = endTimeMillis - ONE_WEEK_IN_MILLIS;
  const dangerousWeekAgoDateObject = getUTCStartOfDay(new Date(dangerousWeekAgo));

  const dayOfWeek = dangerousWeekAgoDateObject.getUTCDay();
  // Here, 0 = SUNDAY. We start on Monday, so we'll need to fall back 6 if so.
  const subtractor = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfPreviousWeek = new Date(dangerousWeekAgoDateObject);
  startOfPreviousWeek.setDate(dangerousWeekAgoDateObject.getDate() - subtractor);
  const endOfPreviousWeek = new Date(dangerousWeekAgoDateObject);
  endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6);

  return { from: startOfPreviousWeek.getTime(), to: getUTCEndOfDay(endOfPreviousWeek).getTime() };
}

function getPrevMonthTimestamps(endTimeMillis: number): TimeRange {
  const dangerousMonthObject = new Date(endTimeMillis);
  // The start of the month using this constructor is 1
  const startOfPreviousMonth = getUTCStartOfDay(
    new Date(dangerousMonthObject.getUTCFullYear(), dangerousMonthObject.getUTCMonth() - 1, 1),
  );
  const endOfPreviousMonth = new Date(startOfPreviousMonth.getUTCFullYear(), startOfPreviousMonth.getUTCMonth() + 1, 0);
  return { from: startOfPreviousMonth.getTime(), to: getUTCEndOfDay(endOfPreviousMonth).getTime() };
}

function getPrevHourTimestamps(endTimeMillis: number): TimeRange {
  const dangerousHourAgoTime = endTimeMillis - ONE_HOUR_IN_MILLIS;
  const startOfPreviousHour = new Date(dangerousHourAgoTime);
  startOfPreviousHour.setMinutes(0);
  startOfPreviousHour.setSeconds(0);
  startOfPreviousHour.setMilliseconds(0);
  const endOfPreviousHour = new Date(dangerousHourAgoTime);
  endOfPreviousHour.setMinutes(59);
  endOfPreviousHour.setSeconds(59);
  endOfPreviousHour.setMilliseconds(999);
  return {
    from: startOfPreviousHour.getTime(),
    to: endOfPreviousHour.getTime(),
  };
}

function getMonthsBack(quantity: number, firstRange: TimeRange): number[] {
  if (quantity <= 1) {
    return [firstRange.from, firstRange.to];
  }
  const monthEnd = new Date(firstRange.to);
  const backwards = [firstRange.to, firstRange.from];
  Array.from({ length: quantity - 1 }).forEach((_, i) => {
    const startOfPreviousMonth = getUTCStartOfDay(
      new Date(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth() - (i + 1), 1),
    );
    backwards.push(startOfPreviousMonth.getTime());
  });
  return backwards.reverse();
}

function getConstantWidthUnitsBack(quantity: number, firstRange: TimeRange, length: number): number[] {
  const backwards = [firstRange.to, firstRange.from];
  Array.from({ length: quantity - 1 }).forEach((_, i) => {
    backwards.push(firstRange.from - (i + 1) * length);
  });
  return backwards.reverse();
}

/**
 *
 * @param quantity The number of buckets needed: note that the resulting array will have N + 1 timestamps
 * @param endTime The default ending time from which to take the previous bucket. (5:00 Tuesday => end of Monday is the last bucket)
 * @param batchFrequency The size parameter of the buckets
 * @returns the millisecond timestamps that will result in N buckets of the requested size. It takes N + 1 timestamps to make N buckets.
 */
export function getSimpleLastNUnitBuckets(quantity: number, endTime: Date, batchFrequency: TimePeriod): number[] {
  let previousBatch = { from: endTime.getTime(), to: endTime.getTime() };
  switch (batchFrequency) {
    case TimePeriod.Pt1H:
      previousBatch = getPrevHourTimestamps(endTime.getTime());
      return getConstantWidthUnitsBack(quantity, previousBatch, ONE_HOUR_IN_MILLIS);
    case TimePeriod.P1D:
      previousBatch = getPrevDayTimestamps(endTime.getTime());
      return getConstantWidthUnitsBack(quantity, previousBatch, ONE_DAY_IN_MILLIS);
    case TimePeriod.P1W:
      previousBatch = getPrevWeekTimestamps(endTime.getTime());
      return getConstantWidthUnitsBack(quantity, previousBatch, ONE_WEEK_IN_MILLIS);
    case TimePeriod.P1M:
      previousBatch = getPrevMonthTimestamps(endTime.getTime());
      return getMonthsBack(quantity, previousBatch);
    default:
      console.error(
        `Attempting to get timestamps for summary cards with unsupported batch frequency ${batchFrequency}`,
      );
      previousBatch = getPrevDayTimestamps(endTime.getTime());
      return getConstantWidthUnitsBack(quantity, previousBatch, ONE_DAY_IN_MILLIS);
  }
}

export function getPrevBatchTimestamps(
  globalRange: SimpleDateRange,
  batchFrequency: TimePeriod,
): PrevBatchTimestampsReturnType {
  const { setStartOfPreviousProfile, setEndOfPreviousProfile } = getFunctionsForTimePeriod.get(batchFrequency) ?? {};
  const { to: openEndTimestamp } = openEndDateRangeTransformer(globalRange);
  const prevBatchStartTimestamp = setStartOfPreviousProfile?.(openEndTimestamp).getTime() ?? openEndTimestamp;
  const prevBatchEndTimestamp = (setEndOfPreviousProfile?.(openEndTimestamp).getTime() ?? globalRange.to) + 1; // add extra millisecond to the end of range
  return {
    prevBatchStartTimestamp,
    prevBatchEndTimestamp,
    globalDayStartTimestamp: globalRange.from,
    globalDayEndTimestamp: globalRange.to,
  };
}

/**
 * Generates the time ranges for querying summary card data
 */
export function getSummaryTimeRanges(
  {
    prevBatchStartTimestamp,
    prevBatchEndTimestamp,
    globalDayStartTimestamp,
    globalDayEndTimestamp,
  }: PrevBatchTimestampsReturnType,
  batchFrequency: TimePeriod,
): SummaryTimeRanges {
  const shortRange = { from: prevBatchStartTimestamp, to: prevBatchEndTimestamp };
  const globalDateRange = { from: globalDayStartTimestamp, to: globalDayEndTimestamp };
  const midRange = getMidRangeFromBatchFrequencyAndShortRange(shortRange, batchFrequency);
  return {
    shortRange,
    midRange,
    globalDateRange,
    batchFrequency,
  };
}

export const TOP_N_ANOMALOUS_LIST = 3;
export const filterMostAnomalousColumnList = (data: ColumnAndMetricAnalysisFragment[]): [string, number][] => {
  const anomaliesByMetric = new Map<string, number>([]);
  data?.forEach(({ column }) => {
    if (!column) return;
    const currentCount = anomaliesByMetric.get(column);
    const newSum = (currentCount ?? 0) + 1;
    anomaliesByMetric.set(column, newSum);
  });
  return [...anomaliesByMetric.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_ANOMALOUS_LIST);
};

export function getAverageOverMidRange(midrangeValue: number, batchFrequency: TimePeriod): number {
  switch (batchFrequency) {
    case TimePeriod.Pt1H:
      return midrangeValue / 24;
    case TimePeriod.P1W:
      return midrangeValue / 4;
    case TimePeriod.P1M:
      return midrangeValue / 3;
    default:
      // Daily
      return midrangeValue / 7;
  }
}

export function getMidRangeComparisonText(batchFrequency: TimePeriod): string {
  switch (batchFrequency) {
    case TimePeriod.Pt1H:
      return 'vs. 24-hour average';
    case TimePeriod.P1W:
      return 'vs. 4-week average';
    case TimePeriod.P1M:
      return 'vs. 3-month average';
    default:
      // Daily
      return 'vs. 7-day average';
  }
}

export function getSimpleBatchText(batchFrequency: TimePeriod): string {
  switch (batchFrequency) {
    case TimePeriod.Pt1H:
      return 'hour';
    case TimePeriod.P1W:
      return 'week';
    case TimePeriod.P1M:
      return 'month';
    default:
      // Daily
      return 'day';
  }
}
