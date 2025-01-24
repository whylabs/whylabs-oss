import { formatDateTimeNumber, getFullDateFromISO, newDateFrom } from 'utils/dateUtils';
import { TimePeriod } from 'generated/graphql';
import { RangePreset } from 'hooks/useDynamicTrailingRangePresets';
import { DatesRangeValue, DateValue } from '@mantine/dates';
import { DateTimeRange } from 'hooks/useCustomMonitor/monitorUtils';
import { FloatingPosition } from '@mantine/core/lib/Floating';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { ReactElement } from 'react';

// These are different because the dark version is the input used in the dark header.
// It has to be smaller according to the design specs
export const DARK_DATE_RANGE_INPUT_WIDTH = 238;
export const DARK_DATE_HOUR_RANGE_INPUT_WIDTH = 305;
export const LIGHT_DATE_RANGE_INPUT_WIDTH = 262;
export const LIGHT_DATE_HOUR_RANGE_INPUT_WIDTH = 335;

export type PickerDatesReturnType = {
  usedRange?: DatesRangeValue;
  usedStartTime?: string;
  usedEndTime?: string;
};

export interface SuperPickerContext {
  startDate?: DateValue;
  startHours?: TimeObject;
  endDate?: DateValue;
  endHours?: TimeObject;
  opened: boolean;
  invalidMessage?: string;
  tempSelectedStartDate?: DateValue;
  defaultInputFocus?: 'start' | 'end';
}
export type NullableDateConstructor = number | string | null | Date;
export type CustomRangeSearchParams =
  | {
      startDateSearchParamKey: string;
      endDateSearchParamKey: string;
      dynamicPresetSearchParamKey: string;
    }
  // this undefined object is for prevent missing one of the keys when customizing the search params
  | {
      startDateSearchParamKey?: undefined;
      endDateSearchParamKey?: undefined;
      dynamicPresetSearchParamKey?: undefined;
    };
export type TimeObject = {
  hours: number;
  minutes: number;
  seconds?: number;
};

export type WhyLabsSuperDatePickerProps = {
  maxDaysInRange?: number;
  minUtcDate?: Date;
  withinPortal?: boolean;
  maxUtcDate?: Date;
  label?: string;
  hideLabel?: boolean;
  presetsListPosition?: 'start' | 'end';
  hideDefaultPresetsList?: boolean;
  extraPresetList?: RangePreset[];
  variant?: 'dark' | 'light';
  onApply?: (p: DateTimeRange) => void;
  onClose?: () => void;
  width?: string;
  position?: FloatingPosition;
  disabled?: boolean;
  informativeText?: string | ReactElement;
} & WhyLabsPickerCommonProps;

export type WhyLabsPickerCommonProps = CustomRangeSearchParams & PickerControlProps;
export type PickerControlProps = {
  timePeriod?: TimePeriod;
  shouldTruncateRangeIfNeeded?: boolean;
  loading?: boolean;
};

export const addOneMillisecondToDate = (d: Date): Date => {
  return new Date(d.getTime() + 1);
};

export const CUSTOM_RANGE = 'custom';
export const LINEAGE_RANGE = 'lineage';

export const clearPickerState: Partial<SuperPickerContext> = {
  startDate: undefined,
  endDate: undefined,
  startHours: undefined,
  endHours: undefined,
  invalidMessage: undefined,
  tempSelectedStartDate: undefined,
  defaultInputFocus: undefined,
};

export const translateGMTTimestampToLocalDate = (timestamp: NullableDateConstructor): Date | null => {
  // Mantine uses local timezone in components, so we need to hack it using the ISO string to get the GMT day
  // and use 00:00:00 time string on instantiate to create a date object on the correct day
  if (!timestamp) return null;
  const dateString = getFullDateFromISO(newDateFrom(timestamp).toISOString());
  return new Date(`${dateString} 00:00:00`);
};

export const createISOStringWithUpdatedHours = (localDate: Date, timeString = '00:00'): string => {
  const dateString = `${localDate.getFullYear()}-${formatDateTimeNumber(
    localDate.getMonth() + 1,
  )}-${formatDateTimeNumber(localDate.getDate())}`;
  return `${dateString}T${timeString}Z`;
};

export const timeStringToObject = (timeString: string): TimeObject => {
  const [hours, minutes, seconds] = timeString.split(':');
  const [castedHours, castedMinutes, castedSeconds] = [Number(hours), Number(minutes), Number(seconds)];
  return {
    hours: Number.isNaN(castedHours) ? 0 : castedHours,
    minutes: Number.isNaN(castedMinutes) ? 0 : castedMinutes,
    seconds: Number.isNaN(castedSeconds) ? 0 : castedSeconds,
  };
};

export const getUTCHoursString = (date: Date | string | number): string => {
  const parsed = newDateFrom(date);
  return parsed.toISOString().substring(11, 16);
};

export const timeObjectToString = ({ hours, minutes }: TimeObject): string => {
  return [hours, minutes].map(formatDateTimeNumber).join(':');
};

export const getPickerTempDateRange = (tempSelection: PickerDatesReturnType): [number, number] | null => {
  const { usedRange, usedStartTime, usedEndTime } = tempSelection;
  const [start, end] = usedRange ?? [];
  if (!start || !end) return null;
  if (!usedStartTime || !usedEndTime) {
    return [start.getTime(), end.getTime()];
  }
  const startDateWithTime = getFullDateFromISO(start.toISOString()).concat(`T${usedStartTime}Z`);
  const endDateWithTime = getFullDateFromISO(end.toISOString()).concat(`T${usedEndTime}Z`);
  return [new Date(startDateWithTime).getTime(), new Date(endDateWithTime).getTime()];
};

export const isInvalidDateRange = (start: number, end: number): boolean => {
  return end < start;
};

export const handleURLSearchParamUpdate = (
  params: URLSearchParams,
  paramKey: string,
  paramValue?: NullableDateConstructor,
): void => {
  if (paramValue) {
    params.set(paramKey, paramValue.toString());
    return;
  }
  // Null will remove the param, undefined will not change it
  if (paramValue === null) {
    params.delete(paramKey);
  }
};

export const handleLineagePresetString = (lineage: string): string => {
  if (lineage.length > 32) {
    return lineage.replace('to', 'to \n');
  }
  return lineage;
};

export const dateConstructorToReadableISOString = (
  value: NullableDateConstructor,
  {
    includeHours = true,
  }: {
    includeHours?: boolean;
  } = {},
): string | null => {
  if (!value) return null;
  const date = newDateFrom(value);
  const isoString = date.toISOString();
  const dateString = isoString.substring(0, 10);
  if (!includeHours) return dateString;

  const utcHour = formatDateTimeNumber(date.getUTCHours());
  const utcMinutes = formatDateTimeNumber(date.getUTCMinutes());

  return dateString.concat(`T${utcHour}h${utcMinutes}m`);
};

export type ReadableDateType = 'start' | 'end';
export const readableISOToStandardISO = (value: string, type: ReadableDateType): string => {
  const isStart = type === 'start';
  const fallbackHours = isStart ? '00:00' : '23:59';
  if (value.length === 'yyyy-mm-dd'.length) {
    return `${value}T${fallbackHours}Z`;
  }
  const dateString = getFullDateFromISO(value);
  const utcHours = value.substring(11, 13);
  const utcMinutes = value.substring(14, 16);
  const formattedHours = utcHours ? formatDateTimeNumber(utcHours) : null;
  const formattedMinutes = utcMinutes ? formatDateTimeNumber(utcMinutes) : null;
  const hours = !!formattedHours && !!formattedMinutes ? `${formattedHours}:${formattedMinutes}` : null;
  return `${dateString}T${hours ?? fallbackHours}Z`;
};

export const convertReadableParamToDate = (param: string | null, type: ReadableDateType): Date | null => {
  if (!param) return null;
  try {
    const date = new Date(readableISOToStandardISO(param, type));
    if (Number.isFinite(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.error(`Failed trying to instantiate a date from the url Param: ${param}`, e);
  }
  return null;
};

function machineDateToReadable(machineDate?: string | null): string {
  return machineDate?.replaceAll('-', '/').replace('T', ' ').replace('Z', '').replace('h', ':').replace('m', '') ?? '';
}

export function createFriendlyDisplayStringFromDateRange(dateRange: SimpleDateRange, includeHours = false): string {
  const start = machineDateToReadable(dateConstructorToReadableISOString(dateRange.from, { includeHours }));
  const end = machineDateToReadable(dateConstructorToReadableISOString(dateRange.to, { includeHours }));
  return `${start} - ${end}`;
}

export const generateReadableDateRange = (
  from: NullableDateConstructor,
  to: NullableDateConstructor,
): [string, string] | null => {
  const readableFrom = dateConstructorToReadableISOString(from);
  const readableTo = dateConstructorToReadableISOString(to);
  if (!readableFrom || !readableTo) return null;
  return [readableFrom, readableTo];
};

export const handleEndTimestampRounding = (endDate: number | Date): number => {
  const date = new Date(endDate);
  if (date.getUTCMilliseconds() !== 0) return date.getTime() + 1;
  return date.getTime();
};
