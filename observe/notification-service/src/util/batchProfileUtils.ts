import { TimePeriod } from '@whylabs/songbird-node-client';

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

export const mapStringToTimePeriod = new Map<string, TimePeriod>([
  ['PTM', TimePeriod.P1M],
  ['P1W', TimePeriod.P1W],
  ['P1D', TimePeriod.P1D],
  ['PT1H', TimePeriod.Pt1H],
]);

type DateTranslator = (date: Date | number) => Date;
export const rangeTranslatorByTimePeriod = new Map<TimePeriod, { startFn: DateTranslator; endFn: DateTranslator }>([
  [TimePeriod.Pt1H, { startFn: setStartOfUTCHour, endFn: setEndOfUTCHour }],
  [TimePeriod.P1D, { startFn: setStartOfUTCDay, endFn: setEndOfUTCDay }],
  [TimePeriod.P1W, { startFn: setStartOfUTCWeek, endFn: setEndOfUTCWeek }],
  [TimePeriod.P1M, { startFn: setStartOfUTCMonth, endFn: setEndOfUTCMonth }],
]);

export const getEndOfProfile = (timePeriod: TimePeriod = TimePeriod.P1D, datasetTimestamp: number): number => {
  const { endFn } = rangeTranslatorByTimePeriod.get(timePeriod) ?? {};
  // the platform will manage the endDate to query with exclusive timestamp
  return endFn?.(datasetTimestamp).getTime() ?? datasetTimestamp + 1;
};
