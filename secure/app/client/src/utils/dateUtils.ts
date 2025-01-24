import { formatDistance, isAfter, isBefore, isEqual, isValid } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';
import { TimePeriod } from '~server/types/api';
import { NullableString } from '~server/types/generic-types';

export type PossibleDateInput = Date | string | number;

const ONLY_NUMBER_REGEX = /^\d+$/;
export const newDateFrom = (date: PossibleDateInput): Date => {
  if (typeof date === 'object') return new Date(date);
  if (typeof date === 'string' && ONLY_NUMBER_REGEX.test(date)) return new Date(Number(date));
  return new Date(date);
};

function universalFormat(timestamp: number, dateFormat: string) {
  // eslint-disable-next-line no-restricted-globals
  if (!timestamp || isNaN(timestamp)) {
    console.error("universalFormat: can't format invalid timestamp");
    return '';
  }

  return format(utcToZonedTime(new Date(timestamp), 'UTC'), dateFormat, { timeZone: 'UTC' });
}

export const dateOnly = (timestamp: string | number): string => {
  return universalFormat(newDateFrom(timestamp).getTime(), dateOnlyFormat);
};

export const timeLong = (timestamp: number, batchFrequency?: TimePeriod | undefined): string => {
  const dateFormat = batchFrequency === TimePeriod.Pt1H ? hourlyGraphFormat : tooltipDateFormat;
  return universalFormat(timestamp, dateFormat);
};

export const dateTimeFull = (timestamp: number): string => {
  return universalFormat(timestamp, tooltipDateFormat);
};

export const parseDateWithFallback = (dateString: NullableString, fallback: Date): Date => {
  if (!dateString) return fallback;

  const parsedDate = newDateFrom(dateString);
  if (isValid(parsedDate)) return parsedDate;
  return fallback;
};

export const rangePickerDate = (timestamp: number): string => {
  return universalFormat(timestamp, datePickerDateFormat);
};

export const tooltipDateFormat = 'yyyy-MM-dd HH:mm:ss zzz';
export const datePickerDateFormat = 'yyyy/MM/dd';
export const dateOnlyFormat = 'MM/dd/yyyy';
export const hourlyGraphFormat = 'MM/dd HH:mm zzz';

type CompareDatesProps = { date: Date; dateToCompare: Date };

export const areDatesEqual = ({ date, dateToCompare }: CompareDatesProps): boolean => {
  return isEqual(date, dateToCompare);
};

export const isDateBefore = ({ date, dateToCompare }: CompareDatesProps): boolean => {
  return isBefore(date, dateToCompare);
};

export const isDateEqualOrBefore = (props: CompareDatesProps): boolean => {
  return areDatesEqual(props) || isDateBefore(props);
};

export const isDateAfter = ({ date, dateToCompare }: CompareDatesProps): boolean => {
  return isAfter(date, dateToCompare);
};

export const isDateEqualOrAfter = (props: CompareDatesProps): boolean => {
  return areDatesEqual(props) || isDateAfter(props);
};

export const cloneDateUTCHours = (previousTimestamp: number, newDate: Date | number) => {
  const prevDate = new Date(previousTimestamp);
  const prevStartHours = prevDate.getUTCHours();
  const prevStartMinutes = prevDate.getUTCMinutes();
  const prevStartSeconds = prevDate.getUTCSeconds();
  const prevStartMillis = prevDate.getUTCMilliseconds();
  const dateCopy = new Date(newDate);
  dateCopy.setUTCHours(prevStartHours, prevStartMinutes, prevStartSeconds, prevStartMillis);
  return dateCopy;
};

export const formatDateTimeNumber = (value: number | string): string => String(value).padStart(2, '0');

export const getFullDateFromISO = (isoString: string): string => isoString.substring(0, 10);

export const formatUtcDateString = (dateConstructor: PossibleDateInput): string => {
  const date = newDateFrom(dateConstructor);
  return getFullDateFromISO(date.toISOString()).replaceAll('-', '/');
};

export const displayRelativeDistanceTo = (from: PossibleDateInput, to: PossibleDateInput) => {
  const dateFrom = newDateFrom(from);
  const dateTo = newDateFrom(to);
  return formatDistance(dateFrom, dateTo, { addSuffix: true, includeSeconds: true });
};

export const getUTCEndOfDay = (dateObject: Date | number): Date => {
  const copy = new Date(dateObject);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};
