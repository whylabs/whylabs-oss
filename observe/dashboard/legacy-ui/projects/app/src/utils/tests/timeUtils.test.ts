// Create unit tests for timeUtils.ts file  (see example below)
import {
  ONE_DAY_IN_MILLIS,
  ONE_HOUR_IN_MILLIS,
  ONE_MINUTE_IN_MILLIS,
  ONE_MONTH_IN_MILLIS,
  ONE_WEEK_IN_MILLIS,
} from 'ui/constants';
import { getFriendlyTimeDistanceName } from '../timeUtils';

describe('getFriendlyTimeDistanceName', () => {
  it.each([
    [1000, '1 second'],
    [2000, '2 seconds'],
    [ONE_MINUTE_IN_MILLIS, '1 minute'],
    [2 * ONE_MINUTE_IN_MILLIS, '2 minutes'],
    [ONE_HOUR_IN_MILLIS, '1 hour'],
    [2 * ONE_HOUR_IN_MILLIS, '2 hours'],
    [ONE_DAY_IN_MILLIS, '1 day'],
    [2 * ONE_DAY_IN_MILLIS, '2 days'],
    [ONE_WEEK_IN_MILLIS, '1 week'],
    [2 * ONE_WEEK_IN_MILLIS, '2 weeks'],
    [ONE_MONTH_IN_MILLIS, '1 month'],
    [2 * ONE_MONTH_IN_MILLIS, '2 months'],
  ])('should return the correct time distance string for single and plural amounts', (input, expected) => {
    expect(getFriendlyTimeDistanceName(input, 1)).toBe(expected);
  });

  it('returns the empty string for negative multipliers', () => {
    expect(getFriendlyTimeDistanceName(1000, -1)).toBe('');
  });

  it('returns the empty string for zero multipliers', () => {
    expect(getFriendlyTimeDistanceName(1000, 0)).toBe('');
  });

  it.each([
    [1000, '1 second'],
    [2000, '2 seconds'],
    [ONE_MINUTE_IN_MILLIS, '60 seconds'],
    [2 * ONE_MINUTE_IN_MILLIS, '2 minutes'],
    [ONE_HOUR_IN_MILLIS, '60 minutes'],
    [2 * ONE_HOUR_IN_MILLIS, '2 hours'],
    [ONE_DAY_IN_MILLIS, '24 hours'],
    [2 * ONE_DAY_IN_MILLIS, '2 days'],
    [ONE_WEEK_IN_MILLIS, '7 days'],
    [2 * ONE_WEEK_IN_MILLIS, '2 weeks'],
    [ONE_MONTH_IN_MILLIS, '4 weeks'],
    [2 * ONE_MONTH_IN_MILLIS, '2 months'],
  ])('should return the correct time distance string for with a higher multiplier', (input, expected) => {
    expect(getFriendlyTimeDistanceName(input, 2)).toBe(expected);
  });

  it.each([
    [1333, '1 second'],
    [1899, '2 seconds'],
    [2 * ONE_MINUTE_IN_MILLIS + 3, '2 minutes'],
    [2.1 * ONE_HOUR_IN_MILLIS, '2 hours'],
    [1.52 * ONE_DAY_IN_MILLIS, '36 hours'],
    [2.003 * ONE_DAY_IN_MILLIS, '2 days'],
    [1.2 * ONE_WEEK_IN_MILLIS, '8 days'],
    [2.4 * ONE_WEEK_IN_MILLIS, '2 weeks'],
    [1.0005 * ONE_MONTH_IN_MILLIS, '4 weeks'],
    [2.399 * ONE_MONTH_IN_MILLIS, '2 months'],
  ])('handles rounding as expected', (input, expected) => {
    expect(getFriendlyTimeDistanceName(input, 2)).toBe(expected);
  });
});
