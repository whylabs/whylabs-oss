import { SimpleDateRange } from '~/types/dateTypes';
import { PossibleDateInput, formatDateTimeNumber, newDateFrom } from '~/utils/dateUtils';
import { TimePeriod } from '~server/types/api';

export const setEndOfUTCMinute = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCSeconds(59, 999);
  return copy;
};

export const setEndOfUTCHour = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCMinutes(59, 59, 999);
  return copy;
};
export const setStartOfUTCHour = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCMinutes(0, 0, 0);
  return copy;
};
export const calculateHourlyTrailingWindow = (size: number): [Date, Date] => {
  const now = new Date();
  const end = setEndOfUTCHour(now);
  const start = setStartOfUTCHour(now.setUTCHours(now.getUTCHours() - size));
  return [start, end];
};

export const setEndOfUTCDay = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};

export const setStartOfUTCDay = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

export const calculateDailyTrailingWindow = (size: number): [Date, Date] => {
  const now = new Date();
  const end = setEndOfUTCDay(now);
  const start = setStartOfUTCDay(now.setUTCDate(now.getUTCDate() - size));
  return [start, end];
};

export const SUNDAY = 0;
export const setStartOfUTCWeek = (date: Date | number): Date => {
  const copy = new Date(date);

  const weekDay = copy.getUTCDay();
  // Using Monday as first week day
  const daysToSubtract = weekDay === SUNDAY ? 6 : copy.getUTCDay() - 1;
  copy.setUTCDate(copy.getUTCDate() - daysToSubtract);
  return setStartOfUTCDay(copy);
};

export const setEndOfUTCWeek = (date: Date | number): Date => {
  const copy = new Date(date);
  const weekDay = copy.getUTCDay();
  // Using Sunday as last week day
  if (weekDay !== SUNDAY) {
    copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay() + 7);
  }
  return setEndOfUTCDay(copy);
};

export const calculateWeeklyTrailingWindow = (size: number): [Date, Date] => {
  const now = new Date();
  const end = setEndOfUTCDay(now);
  const start = setStartOfUTCWeek(now.setUTCDate(now.getUTCDate() - size * 7));
  return [start, end];
};

export const setEndOfUTCMonth = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + 1, 0);
  return setEndOfUTCDay(copy);
};

export const setStartOfUTCMonth = (date: Date | number): Date => {
  const copy = new Date(date);
  copy.setUTCDate(1);
  return setStartOfUTCDay(copy);
};

export const calculateMonthlyTrailingWindow = (size: number): [Date, Date] => {
  const now = new Date();
  const end = setEndOfUTCDay(now);
  const start = setStartOfUTCMonth(now.setUTCMonth(now.getUTCMonth() - size));
  return [start, end];
};

export const dateToUTCDateString = (date: Date, separator = '/') =>
  `${date.getUTCFullYear()}${separator}${formatDateTimeNumber(
    date.getUTCMonth() + 1,
  )}${separator}${formatDateTimeNumber(date.getUTCDate())}`;
export const dateToUTCTimeString = (date: Date) =>
  `${formatDateTimeNumber(date.getUTCHours())}:${formatDateTimeNumber(date.getUTCMinutes())}`;

export const getUTCDateRangeString = (
  start: PossibleDateInput,
  end: PossibleDateInput,
  batchFrequency: TimePeriod = TimePeriod.P1D,
  includeUTC = true,
) => {
  const startDate = newDateFrom(start);
  const endDate = newDateFrom(end);
  const startDateString = dateToUTCDateString(startDate);
  const endDateString = dateToUTCDateString(endDate);
  if (batchFrequency === TimePeriod.Pt1H) {
    return `${startDateString} ${dateToUTCTimeString(startDate)} to ${endDateString} ${dateToUTCTimeString(endDate)}${
      includeUTC ? ' UTC' : ''
    }`;
  }
  return `${startDateString} to ${endDateString}${includeUTC ? ' UTC' : ''}`;
};

type DateTranslator = (date: Date | number) => Date;
export const rangeTranslatorByTimePeriod = new Map<TimePeriod, { startFn: DateTranslator; endFn: DateTranslator }>([
  [TimePeriod.Pt1H, { startFn: setStartOfUTCHour, endFn: setEndOfUTCHour }],
  [TimePeriod.P1D, { startFn: setStartOfUTCDay, endFn: setEndOfUTCDay }],
  [TimePeriod.P1W, { startFn: setStartOfUTCWeek, endFn: setEndOfUTCWeek }],
  [TimePeriod.P1M, { startFn: setStartOfUTCMonth, endFn: setEndOfUTCMonth }],
]);

/* Subtract one millisecond of the end date, so we make the dateRange minutes 59:59.999 */
export const openEndDateRangeTransformer = ({ from, to }: SimpleDateRange): SimpleDateRange => {
  return { from, to: to - 1 };
};
