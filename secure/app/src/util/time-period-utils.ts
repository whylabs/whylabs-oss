import { DataGranularity, TimePeriod } from '../types/api';

export const ONE_MINUTE_IN_MILLIS = 1000 * 60;

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

export const compareAndReturnHigherTimePeriod = (timePeriod: TimePeriod, compareTo: TimePeriod): TimePeriod => {
  const timePeriodOrder = [TimePeriod.Pt1H, TimePeriod.P1D, TimePeriod.P1W, TimePeriod.P1M];
  const timePeriodIndex = timePeriodOrder.indexOf(timePeriod);
  const compareToIndex = timePeriodOrder.indexOf(compareTo);
  if (timePeriodIndex > compareToIndex) {
    return timePeriod;
  }
  return compareTo;
};
