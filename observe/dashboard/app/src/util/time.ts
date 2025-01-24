import { format } from 'date-fns';

import { MILLIS_PER_DAY } from '../constants';

export const toHumanReadableTime = (epochMilliseconds: number): string =>
  format(epochMilliseconds, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

export const toTimestamp = (dateString?: string): number | undefined => {
  if (!dateString) {
    return undefined;
  }
  const parsed = Date.parse(dateString);
  return isNaN(parsed) ? undefined : parsed;
};

/**
 * Subtracts the specified number of days, ignoring timezones/DST
 * @param timestampMs
 * @param days
 */
export const subDaysUTC = (timestampMs: number, days: number): number => timestampMs - days * MILLIS_PER_DAY;
