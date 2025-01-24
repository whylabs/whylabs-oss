import { DataGranularity } from '@whylabs/data-service-node-client';

import { TimePeriod } from '../graphql/generated/graphql';

export const ONE_MINUTE_IN_MILLIS = 1000 * 60;
export const ONE_HOUR_IN_MILLIS = 60 * ONE_MINUTE_IN_MILLIS;
export const ONE_DAY_IN_MILLIS = 24 * ONE_HOUR_IN_MILLIS;
export const ONE_WEEK_IN_MILLIS = 7 * 24 * ONE_HOUR_IN_MILLIS;
export const ONE_MONTH_IN_MILLIS = 30 * 24 * ONE_HOUR_IN_MILLIS;
export const SIX_DAYS_IN_MILLISECONDS = 6 * ONE_DAY_IN_MILLIS;
export const TWENTY_SEVEN_DAYS_IN_MILLISECONDS = 27 * ONE_DAY_IN_MILLIS;

export const mapStringToGranularity = new Map<string, DataGranularity>([
  ['P1M', DataGranularity.Monthly],
  ['P1W', DataGranularity.Weekly],
  ['P1D', DataGranularity.Daily],
  ['PT1H', DataGranularity.Hourly],
]);

export const mapStringToTimePeriod = new Map<string, TimePeriod>([
  ['PTM', TimePeriod.P1M],
  ['P1W', TimePeriod.P1W],
  ['P1D', TimePeriod.P1D],
  ['PT1H', TimePeriod.Pt1H],
]);

export const timePeriodToTimeUnit = new Map<TimePeriod, string>([
  [TimePeriod.P1M, 'months'],
  [TimePeriod.P1W, 'weeks'],
  [TimePeriod.P1D, 'days'],
  [TimePeriod.Pt1H, 'hours'],
]);

export const timePeriodToTimeElement = new Map<TimePeriod, string>([
  [TimePeriod.P1M, 'M'],
  [TimePeriod.P1W, 'W'],
  [TimePeriod.P1D, 'D'],
  [TimePeriod.Pt1H, 'H'],
]);

export const compareAndReturnHigherTimePeriod = (timePeriod: TimePeriod, compareTo: TimePeriod): TimePeriod => {
  const timePeriodOrder = [TimePeriod.Pt1H, TimePeriod.P1D, TimePeriod.P1W, TimePeriod.P1M];
  const timePeriodIndex = timePeriodOrder.indexOf(timePeriod);
  const compareToIndex = timePeriodOrder.indexOf(compareTo);
  if (timePeriodIndex > compareToIndex) {
    return timePeriod;
  }
  return compareTo;
};

export const getMillisecondsForBatchFrequency = (batchFrequency: TimePeriod): number => {
  switch (batchFrequency) {
    case TimePeriod.P1D:
      return ONE_DAY_IN_MILLIS;
    case TimePeriod.P1M:
      return ONE_MONTH_IN_MILLIS;
    case TimePeriod.P1W:
      return ONE_WEEK_IN_MILLIS;
    case TimePeriod.Pt1H:
      return ONE_HOUR_IN_MILLIS;
    default:
      return ONE_DAY_IN_MILLIS;
  }
};

type BatchType = 'Hourly' | 'Daily' | 'Unknown' | 'Weekly' | 'Monthly';

export const convertAbbreviationToBatchType = (abbreviation?: TimePeriod): BatchType => {
  if (abbreviation === 'P1D') {
    return 'Daily';
  }
  if (abbreviation === 'PT1H') {
    return 'Hourly';
  }
  if (abbreviation === 'P1W') {
    return 'Weekly';
  }
  if (abbreviation === 'P1M') {
    return 'Monthly';
  }
  return 'Unknown';
};

export const addOneMillisecondToDate = (d: Date): Date => {
  return new Date(d.getTime() + 1);
};
