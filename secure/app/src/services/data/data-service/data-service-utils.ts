import { DateRange, TimePeriod } from '../../../types/api';
import { InvalidTimeRangeError } from '../../errors/data-service-errors';

// converts timestamps in millis to a postgres interval
export const getInterval = (from: number, to?: number | null): string => {
  const intervalLimit = to ?? from;
  if (from > intervalLimit) {
    throw new InvalidTimeRangeError('Ending timestamp must be greater than the starting timestamp');
  }
  return `${new Date(from).toISOString()}/${new Date(intervalLimit).toISOString()}`;
};

export const intervalToDateRange = (interval: string): DateRange | null => {
  const [start, end] = interval.split('/');
  const fromTimestamp = new Date(start).getTime();
  const toTimestamp = new Date(end).getTime();
  if (!Number.isNaN(fromTimestamp) && !Number.isNaN(toTimestamp)) {
    return {
      fromTimestamp,
      toTimestamp,
    };
  }
  return null;
};

export const getIntervalWithDuration = (from: number, granularity: TimePeriod): string => {
  if ([TimePeriod.Individual, TimePeriod.Unknown, TimePeriod.All].includes(granularity)) {
    throw new InvalidTimeRangeError('Invalid time-period for ISO interval with duration');
  }
  return `${new Date(from).toISOString()}/${granularity}`;
};
