import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInWeeks,
  isValid,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { UTC_TIME } from 'constants/hardcoded';
import { TimePeriod } from 'generated/graphql';
import { format, utcToZonedTime } from 'date-fns-tz';
import { times } from './numberUtils';
import { getUTCEndOfDay, getUTCStartOfDay, SimpleDateRange } from './dateRangeUtils';
import { NullableString } from '../types/genericTypes';

export type TimeRange = { from: number; to: number };

type DateNumber = Date | number;

type UnitType = 'D' | 'H' | 'W' | 'M';

export interface DateBucket {
  from: Date;
  to: Date;
}

export type PossibleDateInput = Date | string | number;

const ONLY_NUMBER_REGEX = /^\d+$/;
export const newDateFrom = (date: PossibleDateInput): Date => {
  if (typeof date === 'object') return new Date(date);
  if (typeof date === 'string' && ONLY_NUMBER_REGEX.test(date)) return new Date(Number(date));
  return new Date(date);
};

export function getBucketLength(batchFrequency: TimePeriod | undefined, referenceDate?: Date): number {
  // Returns number of milliseconds in the bucket
  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;

  if (batchFrequency === TimePeriod.Pt1H) {
    return hour;
  }
  if (batchFrequency === TimePeriod.P1D) {
    return day;
  }
  if (batchFrequency === TimePeriod.P1W) {
    return week;
  }
  // if (batchFrequency === TimePeriod.P1M) {
  // The value returned by Monthly can vary depending on the current month
  //   const date = referenceDate ? referenceDate : new Date();
  //   return differenceInMilliseconds(date, addMonths(date, 1).getTime());
  // }
  return day;
}

export function getDateUnitLength(dateRange: SimpleDateRange, unit: UnitType | TimePeriod = 'D'): number {
  if (unit === 'H' || unit === 'PT1H') {
    return differenceInHours(dateRange.to, dateRange.from);
  }
  if (unit === 'W' || unit === 'P1W') {
    return differenceInWeeks(dateRange.to, dateRange.from);
  }
  if (unit === 'M' || unit === 'P1M') {
    return differenceInMonths(dateRange.to, dateRange.from);
  }
  return differenceInDays(dateRange.to, dateRange.from);
}

export function getDateBuckets(
  dateRange: SimpleDateRange,
  preferredNumber = 30,
  unit: UnitType = 'D',
  maxBuckets = 36,
  includeLastUnit = true, // includes last unit of time, so that we get ending bucket as well.
): DateBucket[] {
  const naturalBucketNumber = includeLastUnit
    ? getDateUnitLength(dateRange, unit) + 1
    : getDateUnitLength(dateRange, unit);
  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);
  if (naturalBucketNumber === 0) {
    const singleBucket: DateBucket = {
      from: new Date(dateRange.from),
      to: new Date(dateRange.to),
    };
    return [singleBucket];
  }
  const buckets: DateBucket[] = [];
  let actualBucketNumber = naturalBucketNumber;
  const maxNumber = preferredNumber * 1.25 > maxBuckets ? maxBuckets : Math.floor(preferredNumber * 1.25);
  let step = 1;
  if (naturalBucketNumber > maxNumber) {
    while (actualBucketNumber > maxNumber) {
      actualBucketNumber = Math.floor(actualBucketNumber * 0.5);
      step *= 2;
    }
  }

  let currentDate = startDate;
  times(actualBucketNumber, () => {
    if (unit === 'D') {
      buckets.push({ from: currentDate, to: addNDays(currentDate, step) });
      currentDate = addNDays(currentDate, step);
    } else if (unit === 'H') {
      buckets.push({ from: currentDate, to: addHours(currentDate, step) });
      currentDate = addHours(currentDate, step);
    } else if (unit === 'W') {
      buckets.push({ from: currentDate, to: addWeeks(currentDate, step) });
      currentDate = addWeeks(currentDate, step);
    } else if (unit === 'M') {
      buckets.push({ from: currentDate, to: addMonths(currentDate, step) });
      currentDate = addMonths(currentDate, step);
    }
  });
  const lastTime = buckets[buckets.length - 1].to;
  if (lastTime < endDate) {
    buckets.push({ from: lastTime, to: endDate });
  }
  return buckets;
}

export const getFullDateFromISO = (isoString: string): string => isoString.substring(0, 10);

export const formatUtcDateString = (dateConstructor: PossibleDateInput): string => {
  const date = newDateFrom(dateConstructor);
  return getFullDateFromISO(date.toISOString()).replaceAll('-', '/');
};

export function getBucketsForEachWholeUnit(
  dateRange: SimpleDateRange,
  unit: UnitType = 'D',
  includeLastUnit = true, // includes last unit of time, so that we get ending bucket aswell.
): DateBucket[] {
  const naturalBucketNumber = includeLastUnit
    ? getDateUnitLength(dateRange, unit) + 1
    : getDateUnitLength(dateRange, unit);

  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);

  if (naturalBucketNumber === 0) {
    const singleBucket: DateBucket = {
      from: startDate,
      to: endDate,
    };
    return [singleBucket];
  }
  const buckets: DateBucket[] = [];
  const step = 1;

  let currentDate = startDate;

  times(naturalBucketNumber, () => {
    if (unit === 'D') {
      buckets.push({ from: currentDate, to: addNDays(currentDate, step) });
      currentDate = addNDays(currentDate, step);
    } else if (unit === 'H') {
      buckets.push({ from: currentDate, to: addHours(currentDate, step) });
      currentDate = addHours(currentDate, step);
    } else if (unit === 'W') {
      buckets.push({ from: currentDate, to: addWeeks(currentDate, step) });
      currentDate = addWeeks(currentDate, step);
    } else if (unit === 'M') {
      buckets.push({ from: currentDate, to: addMonths(currentDate, step) });
      currentDate = addMonths(currentDate, step);
    }
  });
  return buckets;
}

function universalFormat(timestamp: number, dateFormat: string) {
  // eslint-disable-next-line no-restricted-globals
  if (!timestamp || isNaN(timestamp)) {
    console.error("universalFormat: can't format invalid timestamp");
    return '';
  }

  if (UTC_TIME) {
    return format(utcToZonedTime(new Date(timestamp), 'UTC'), dateFormat, { timeZone: 'UTC' });
  }
  return format(new Date(timestamp), dateFormat);
}

export const cardsTimeLong = (timestamp: number, batchFrequency?: TimePeriod | undefined): string => {
  const dateFormat = batchFrequency === TimePeriod.Pt1H ? hourlyGraphFullFormat : dateOnlyFormat;
  return universalFormat(timestamp, dateFormat);
};

export const timeLong = (timestamp: number, batchFrequency?: TimePeriod | undefined): string => {
  const dateFormat = batchFrequency === TimePeriod.Pt1H ? hourlyGraphFormat : tooltipDateFormat;
  return universalFormat(timestamp, dateFormat);
};

export const timeMedium = (timestamp: number, batchFrequency: TimePeriod = TimePeriod.Unknown): string => {
  const dateFormat = mediumFormatsByBatchFrequency[batchFrequency];
  return universalFormat(timestamp, dateFormat);
};

export const timeShort = (timestamp: number, batchFrequency: TimePeriod = TimePeriod.Unknown): string => {
  const dateFormat = formatsByBatchFrequency[batchFrequency];
  return universalFormat(timestamp, dateFormat);
};

export const dateTimeFull = (timestamp: number): string => {
  return universalFormat(timestamp, tooltipDateFormat);
};

export const dateOnly = (timestamp: number): string => {
  return universalFormat(timestamp, dateOnlyFormat);
};

export const yearMonthDay = (timestamp: number): string => {
  return universalFormat(timestamp, yearMonthDayFormat);
};

export const yearMonthDayUTC = (timestamp: number): string => {
  return getFullDateFromISO(new Date(timestamp).toISOString());
};

export const tooltipDateFormat = 'yyyy-MM-dd HH:mm:ss zzz';
export const hourlyGraphFormat = 'MM/dd HH:mm zzz';
export const hourlyGraphFullFormat = 'MM/dd/yyyy HH:mm:ss zzz';
export const datePickerDateFormat = 'yyyy/MM/dd';
export const dateOnlyFormat = 'MM/dd/yyyy';
export const monthAndDayFormat = 'MM/dd';
export const yearMonthDayFormat = 'yyyy-MM-dd';

type TimePeriodsObject = {
  [key in TimePeriod]: string;
};
export const formatsByBatchFrequency: TimePeriodsObject = {
  [TimePeriod.P1M]: dateOnlyFormat,
  [TimePeriod.P1W]: monthAndDayFormat,
  [TimePeriod.P1D]: monthAndDayFormat,
  [TimePeriod.Pt1H]: hourlyGraphFormat,
  [TimePeriod.Unknown]: monthAndDayFormat,
  [TimePeriod.All]: monthAndDayFormat,
  [TimePeriod.Individual]: monthAndDayFormat,
};

export const mediumFormatsByBatchFrequency: TimePeriodsObject = {
  [TimePeriod.P1M]: yearMonthDayFormat,
  [TimePeriod.P1W]: yearMonthDayFormat,
  [TimePeriod.P1D]: yearMonthDayFormat,
  [TimePeriod.Pt1H]: hourlyGraphFormat,
  [TimePeriod.Unknown]: yearMonthDayFormat,
  [TimePeriod.All]: yearMonthDayFormat,
  [TimePeriod.Individual]: yearMonthDayFormat,
};

export function getDaysTimestampList(from: DateNumber, to: DateNumber): number[] {
  return getTimestampList(from, to, {
    addFn: addNDays,
    startDateFn: getDateIfNumber,
  });
}

export function getWeeksTimestampList(from: DateNumber, to: DateNumber): number[] {
  return getTimestampList(from, to, {
    addFn: addWeeks,
    startDateFn: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  });
}

export function getMonthsTimestampList(from: DateNumber, to: DateNumber): number[] {
  return getTimestampList(from, to, {
    addFn: addMonths,
    startDateFn: startOfMonth,
  });
}

export const getDaysBucketFromDateRange = (dateRange: SimpleDateRange): Date[] => {
  return getDaysTimestampList(dateRange.from, dateRange.to).map((t) => getUTCStartOfDay(new Date(t)));
};

function getTimestampList(
  from: DateNumber,
  to: DateNumber,
  {
    addFn,
    startDateFn,
  }: {
    addFn: (date: Date, amount: number) => Date;
    startDateFn: (date: number | Date) => Date;
  },
) {
  const list: number[] = [];

  let currentDate = startDateFn(from);
  const stopDate = getDateIfNumber(to);

  while (currentDate <= stopDate) {
    list.push(currentDate.getTime());
    currentDate = addFn(currentDate, 1);
  }

  return list;
}

function getDateIfNumber(from: DateNumber) {
  if (typeof from === 'number') return new Date(from);

  return from;
}

export const generateYesterdayTimestamps = (): TimeRange => {
  const today = getUTCStartOfDay(new Date());
  const yesterday = subDays(today, 1);
  const yesterdayEnd = getUTCEndOfDay(yesterday);
  return {
    from: yesterday.getTime(),
    to: yesterdayEnd.getTime(),
  };
};

export const getFormattedDateRangeString = (range: TimeRange, parentheses = true): string => {
  const fromDate = dateOnly(range.from);
  const toDate = dateOnly(range.to);
  if (!fromDate && !toDate) return '-';
  if (fromDate && toDate && fromDate !== toDate) {
    const rangeString = `${fromDate} - ${toDate}`;
    return parentheses ? `(${rangeString})` : rangeString;
  }
  const dateString = fromDate || toDate;
  return parentheses ? `(${dateString})` : dateString;
};

export type StartAndEndTimestamp = { start: number; end: number };

export const addNDays = (startDate: Date | number, daysToAdd: number): Date => {
  return addDays(startDate, daysToAdd);
};

export const formatDateTimeNumber = (value: number | string): string => String(value).padStart(2, '0');

export const rangePickerDate = (timestamp: number): string => {
  return universalFormat(timestamp, datePickerDateFormat);
};

export const parseDateWithFallback = (dateString: NullableString, fallback: Date): Date => {
  if (!dateString) return fallback;

  const parsedDate = newDateFrom(dateString);
  if (isValid(parsedDate)) return parsedDate;
  return fallback;
};
