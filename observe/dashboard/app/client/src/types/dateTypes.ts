import { TimePeriod } from '~server/graphql/generated/graphql';

export interface SimpleDateRange {
  from: number;
  to: number;
}

export type DateRange = DateRangePreset | DateRangeCustom;

// Can add additional preset types below when we need them.
type DateRangePreset = FromToNowDayPreset;
type DateRangeCustom = FromDateTimeToDateTime;
export enum DateRangeType {
  FromToNow = 'FromToNow',
  DateToDate = 'DateToDate',
}

export type UnitType = 'D' | 'H' | 'M' | 'W';

export interface FromToNowDayPreset {
  readonly type: DateRangeType.FromToNow;
  readonly unit: UnitType | TimePeriod;
  readonly quantity: number;
}

export interface FromDateTimeToDateTime {
  readonly type: DateRangeType.DateToDate;
  readonly from: Date;
  readonly to: Date;
}

export interface DateTimeRange {
  start: Date;
  end: Date;
}
