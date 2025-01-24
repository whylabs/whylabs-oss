import {
  addNDays,
  areDatesEqual,
  displayRelativeDistanceTo,
  formatDateTimeNumber,
  getUTCEndOfDay,
  isDateAfter,
  isDateBefore,
  isDateEqualOrAfter,
  isDateEqualOrBefore,
  newDateFrom,
  parseDateWithFallback,
} from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  // Using India TZ to testing because is a half hour offset edge case
  it('should run on Asia/Kolkata timezone', () => {
    expect(new Date().getTimezoneOffset()).toBe(-330);
  });

  it.each([
    [0, '00'],
    ['2', '02'],
    [20, '20'],
    ['19', '19'],
    ['02', '02'],
  ])('testing formatTimeNumber for %p', (value, expected) => {
    expect(formatDateTimeNumber(value)).toBe(expected);
  });

  describe('areDatesEqual', () => {
    it('should return true when dates are equal', () => {
      expect(
        areDatesEqual({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(true);
    });

    it('should return false when dates are not equal', () => {
      expect(
        areDatesEqual({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-02'),
        }),
      ).toBe(false);
    });
  });

  describe('isDateAfter', () => {
    it('should return true when date1 is after date2', () => {
      expect(
        isDateAfter({
          date: new Date('2020-01-05'),
          dateToCompare: new Date('2020-01-02'),
        }),
      ).toBe(true);
    });

    it('should return false when date1 is before date2', () => {
      expect(
        isDateAfter({
          date: new Date('2020-01-02'),
          dateToCompare: new Date('2020-01-05'),
        }),
      ).toBe(false);
    });

    it('should return false when date1 is equal to date2', () => {
      expect(
        isDateAfter({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(false);
    });
  });

  describe('isDateEqualOrAfter', () => {
    it('should return true when date1 is after date2', () => {
      expect(
        isDateEqualOrAfter({
          date: new Date('2020-01-05'),
          dateToCompare: new Date('2020-01-02'),
        }),
      ).toBe(true);
    });

    it('should return false when date1 is before date2', () => {
      expect(
        isDateEqualOrAfter({
          date: new Date('2020-01-02'),
          dateToCompare: new Date('2020-01-05'),
        }),
      ).toBe(false);
    });

    it('should return true when date1 is equal to date2', () => {
      expect(
        isDateEqualOrAfter({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(true);
    });
  });

  describe('isDateBefore', () => {
    it('should return true when date1 is before date2', () => {
      expect(
        isDateBefore({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-02'),
        }),
      ).toBe(true);
    });

    it('should return false when date1 is after date2', () => {
      expect(
        isDateBefore({
          date: new Date('2020-01-02'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(false);
    });

    it('should return false when date1 is equal to date2', () => {
      expect(
        isDateBefore({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(false);
    });
  });

  describe('isDateEqualOrBefore', () => {
    it('should return true when date1 is before date2', () => {
      expect(
        isDateEqualOrBefore({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-02'),
        }),
      ).toBe(true);
    });

    it('should return false when date1 is after date2', () => {
      expect(
        isDateEqualOrBefore({
          date: new Date('2020-01-02'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(false);
    });

    it('should return true when date1 is equal to date2', () => {
      expect(
        isDateEqualOrBefore({
          date: new Date('2020-01-01'),
          dateToCompare: new Date('2020-01-01'),
        }),
      ).toBe(true);
    });
  });

  describe('getUTCEndOfDay', () => {
    it('should return the end of the day for a given date object', () => {
      const date = new Date('2020-01-01T10:00:00.000Z');
      const endOfDay = getUTCEndOfDay(date);
      expect(endOfDay.toISOString()).toBe('2020-01-01T23:59:59.999Z');
    });

    it('should return the end of the day for a given timestamp', () => {
      const timestamp = new Date('2020-01-01T10:00:00.000Z').getTime();
      const endOfDay = getUTCEndOfDay(timestamp);
      expect(endOfDay.toISOString()).toBe('2020-01-01T23:59:59.999Z');
    });

    it('should handle dates at the end of the month correctly', () => {
      const date = new Date('2020-01-31T10:00:00.000Z');
      const endOfDay = getUTCEndOfDay(date);
      expect(endOfDay.toISOString()).toBe('2020-01-31T23:59:59.999Z');
    });

    it('should handle dates at the end of the year correctly', () => {
      const date = new Date('2020-12-31T10:00:00.000Z');
      const endOfDay = getUTCEndOfDay(date);
      expect(endOfDay.toISOString()).toBe('2020-12-31T23:59:59.999Z');
    });

    it('should handle leap year dates correctly', () => {
      const date = new Date('2020-02-29T10:00:00.000Z');
      const endOfDay = getUTCEndOfDay(date);
      expect(endOfDay.toISOString()).toBe('2020-02-29T23:59:59.999Z');
    });
  });

  describe('parseForGlobalDateRange()', () => {
    it.each([
      ['1577826000000', '2019-12-31T21:00:00.000Z'],
      ['1577840400000', '2020-01-01T01:00:00.000Z'],
    ])('should return correct date for %p', (date, expected) => {
      expect(parseDateWithFallback(date, new Date()).toISOString()).toEqual(expected);
    });

    it.each(['2022-05-20T05:31:00.000Z', '2020-12-31T23:59:00.000Z'])('should return fallback date %p', (expected) => {
      expect(parseDateWithFallback('invalid', new Date(expected)).toISOString()).toEqual(expected);
    });
  });

  describe('with a different timezone', () => {
    beforeEach(() => {
      // Temporarily alter timezone calculation for testing
      /* eslint no-extend-native: "off" */
      Date.prototype.getTimezoneOffset = jest.fn(() => 180);
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    describe('newDateFrom()', () => {
      it.each(['2020-01-01T04:00:00.000Z', '1577851200000', 1577851200000, new Date('2020-01-01T04:00:00.000Z')])(
        'should parse the Date correctly for %p',
        (input) => {
          const parsed = newDateFrom(input);
          expect(parsed.toISOString()).toBe('2020-01-01T04:00:00.000Z');
        },
      );
    });
  });

  describe('displayRelativeDistanceTo', () => {
    it.each([
      ['about 10 years ago', 1292870948000],
      ['11 days ago', 1608490148000],
      ['in about 1 year', 1642704548000],
      ['in about 9 hours', 1609490148000],
    ])('should render %p when timestamp is %p', (expected, timestamp) => {
      expect(displayRelativeDistanceTo(timestamp, new Date())).toEqual(expected);
    });
  });

  describe('addNDays()', () => {
    it.each([
      ['Testing D+ 1', 1685393028113, 1, 1685479428113],
      ['Testing D+0', 1685393028113, 0, 1685393028113],
      ['Testing D+(-1)', 1685393028113, -1, 1685306628113], // subtract 1 day
    ])('%p with addNDays', (_, inputDate, numToAdd, expected) => {
      const result = addNDays(inputDate, numToAdd);
      expect(result.getTime()).toEqual(expected);
    });
  });
});
