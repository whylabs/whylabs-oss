import { DateRange } from 'hooks/lagacyDateRangeUtils';
import qs from 'query-string';
import { useSearchParams } from 'react-router-dom';
import { PROFILE_TAG } from 'types/navTags';
import { useCallback } from 'react';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import {
  getUTCEndOfDay,
  getUTCEndOfMonth,
  getUTCEndOfWeek,
  getUTCStartOfDay,
  getUTCStartOfMonth,
  getUTCStartOfWeek,
  SimpleDateRange,
} from './dateRangeUtils';

/**
 * This function is responsible for converting the date range model that we use into
 * the date portion of the graphql query
 * @deprecated we must remove it ASAP -- traces page is the only blocker for it
 */
export function createQueryDateRange(dateRange: DateRange, now = new Date()): SimpleDateRange {
  const outputRange = {
    from: 0,
    to: 0,
  };
  if (dateRange.type === 'FromToNow') {
    if (dateRange.unit === 'H' || dateRange.unit === 'PT1H') {
      outputRange.from = new Date(now).setHours(now.getHours() - dateRange.quantity, 0, 0, 0);
      outputRange.to = new Date(now).setHours(now.getHours(), 59, 59, 999);
    } else if (dateRange.unit === 'W' || dateRange.unit === 'P1W') {
      const endOfWeekDate = getUTCEndOfWeek(now);
      const pastDate = new Date(now);
      pastDate.setUTCDate(pastDate.getUTCDate() - dateRange.quantity * 7);
      const startOfWeekDate = getUTCStartOfWeek(pastDate);
      outputRange.from = startOfWeekDate.getTime();
      outputRange.to = endOfWeekDate.getTime();
    } else if (dateRange.unit === 'M' || dateRange.unit === 'P1M') {
      const pastMonthDate = new Date(now);
      pastMonthDate.setUTCMonth(pastMonthDate.getUTCMonth() - dateRange.quantity);
      outputRange.from = getUTCStartOfMonth(pastMonthDate).getTime();
      outputRange.to = getUTCEndOfMonth(now).getTime();
    } else {
      const pastDayDate = new Date(now);
      pastDayDate.setUTCDate(pastDayDate.getUTCDate() - dateRange.quantity);
      outputRange.from = getUTCStartOfDay(pastDayDate).getTime();
      outputRange.to = getUTCEndOfDay(now).getTime();
    }
  } else {
    outputRange.from = getUTCStartOfDay(dateRange.from).getTime();
    outputRange.to = getUTCEndOfDay(dateRange.to).getTime();
  }
  return outputRange;
}

export function ensureDateRangeIsAtLeastOneDay(simpleDateRange: SimpleDateRange): SimpleDateRange {
  const endDate = new Date(simpleDateRange.to);
  const beginningDate = new Date(simpleDateRange.from);
  const outputRange = { ...simpleDateRange };

  if (
    beginningDate.getFullYear() === endDate.getFullYear() &&
    beginningDate.getMonth() === endDate.getMonth() &&
    beginningDate.getDay() === endDate.getDay()
  ) {
    outputRange.to += ONE_DAY_IN_MILLIS;
  }

  return outputRange;
}

export function getQueryValues(unparsedQueryString: string, key: string): string[] {
  const foundItems: string[] = [];
  const parsed = qs.parse(unparsedQueryString, { parseNumbers: false, arrayFormat: 'none' });
  const unknownTypedItems = parsed[key];
  if (unknownTypedItems === undefined || unknownTypedItems === null) {
    return foundItems;
  }
  if (Array.isArray(unknownTypedItems)) {
    return unknownTypedItems as string[];
  }
  return [unknownTypedItems];
}

/**
 * Utility for interacting with query parameters via react-router's history and location, which ensures that history is updated and synchronized across components that subscribe to it.
 */
export function useQueryParams(): {
  deleteQueryParam: (key: string) => void;
  setQueryParam: (key: string, value?: string | null) => void;
  getQueryParam: (key: string) => string | undefined;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const deleteQueryParam = useCallback(
    (key: string) =>
      setSearchParams((nextSearchParams) => {
        nextSearchParams.delete(key);
        return nextSearchParams;
      }),
    [setSearchParams],
  );

  function setQueryParam(key: string, value?: string | null) {
    setSearchParams((nextSearchParams) => {
      if (value) {
        nextSearchParams.set(key, value);
      } else {
        nextSearchParams.delete(key);
      }

      return nextSearchParams;
    });
  }

  function getQueryParam(key: string): string | undefined {
    return searchParams.get(key) ?? undefined;
  }

  return {
    deleteQueryParam,
    setQueryParam,
    getQueryParam,
  };
}

export function getNumericQueryValues(unparsedQueryString: string, key: string): number[] {
  const foundItems: number[] = [];
  const parsed = qs.parse(unparsedQueryString, { parseNumbers: true, arrayFormat: 'none' });
  const unknownTypedItems = parsed[key];
  if (unknownTypedItems === undefined || unknownTypedItems === null) {
    return foundItems;
  }
  if (Array.isArray(unknownTypedItems)) {
    unknownTypedItems.forEach((ui) => {
      if (typeof ui === 'number' && Number.isInteger(ui)) {
        foundItems.push(ui);
      } else {
        const num = Number.parseInt(ui as string, 10);
        if (Number.isInteger(num)) {
          foundItems.push(num);
        }
      }
    });
    return foundItems;
  }
  if (typeof unknownTypedItems === 'number' && Number.isInteger(unknownTypedItems)) {
    return [unknownTypedItems];
  }

  return foundItems;
}

export type NumberOrString = number | string;

export function getProfilesFromSearchQuery(unparsedQueryString: string): NumberOrString[] {
  const parsedQueryString = qs.parse(unparsedQueryString, { parseNumbers: true });
  const profiles = parsedQueryString[PROFILE_TAG];

  if (!profiles) return []; // If theres no profile we want to return empty array
  if (!Array.isArray(profiles)) return [profiles]; // If we have one profile we want to return it in array

  return profiles; // Note, batch timestamps get parsed since in qs.parse line we included { parseNumbers: true } option.
}
