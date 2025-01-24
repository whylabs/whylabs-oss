import { TimePeriod } from 'generated/graphql';
import { isTimePeriod } from '../timePeriodUtils';

describe('timePeriodUtils', () => {
  describe('isTimePeriod()', () => {
    it.each(Object.values(TimePeriod))('should return true for %p', (key) => {
      expect(isTimePeriod(key)).toEqual(true);
    });

    it.each(['', 'abc', null, undefined])('should return false for %p', (key) => {
      expect(isTimePeriod(key)).toEqual(false);
    });
  });
});
