import {
  calculateDailyTrailingWindow,
  calculateHourlyTrailingWindow,
  calculateMonthlyTrailingWindow,
  calculateWeeklyTrailingWindow,
  openEndDateRangeTransformer,
  setEndOfPreviousProfile,
  setEndOfUTCDay,
  setEndOfUTCHour,
  setEndOfUTCMinute,
  setEndOfUTCMonth,
  setEndOfUTCWeek,
  setStartOfPreviousProfile,
  setStartOfUTCDay,
  setStartOfUTCHour,
  setStartOfUTCMonth,
  setStartOfUTCWeek,
} from './batchProfileUtils';
import { TimePeriod } from '../generated/graphql';

describe('batchProfileUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z')); // Setting 2021-01-01 00:00 UTC
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('should set end of minute for a giver date', () => {
    const result = setEndOfUTCMinute(new Date('2024-08-09T14:59:00.000Z'));
    expect(result.toISOString()).toEqual('2024-08-09T14:59:59.999Z');
  });

  describe('testing hourly functions', () => {
    it.each([
      ['2023-10-01T03:00:00.000Z', '2023-10-01T03:59:59.999Z'],
      ['2021-01-01T03:40:00.000Z', '2021-01-01T03:59:59.999Z'],
      ['2022-11-01T04:31:00.000Z', '2022-11-01T04:59:59.999Z'],
      ['2023-10-01T04:59:00.000Z', '2023-10-01T04:59:59.999Z'],
    ])('setEndOfUTCHour %p', (input, expected) => {
      const result = setEndOfUTCHour(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      ['2023-10-01T03:00:00.000Z', '2023-10-01T03:00:00.000Z'],
      ['2022-10-01T03:40:00.000Z', '2022-10-01T03:00:00.000Z'],
      ['2020-11-01T04:31:00.000Z', '2020-11-01T04:00:00.000Z'],
      ['2023-10-01T04:59:00.000Z', '2023-10-01T04:00:00.000Z'],
    ])('setStartOfUTCHour %p', (input, expected) => {
      const result = setStartOfUTCHour(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      [1, ['2020-12-31T23:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [4, ['2020-12-31T20:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [6, ['2020-12-31T18:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [12, ['2020-12-31T12:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [24, ['2020-12-31T00:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [48, ['2020-12-30T00:00:00.000Z', '2021-01-01T00:59:59.999Z']],
      [72, ['2020-12-29T00:00:00.000Z', '2021-01-01T00:59:59.999Z']],
    ])('calculateHourlyTrailingWindow with size of %p hours', (size, [expectedFrom, expectedTo]) => {
      const [from, to] = calculateHourlyTrailingWindow(size);
      expect(from.toISOString()).toEqual(expectedFrom);
      expect(to.toISOString()).toEqual(expectedTo);
    });
  });

  describe('testing daily functions', () => {
    it.each([
      ['2021-10-01T03:00:00.000Z', '2021-10-01T23:59:59.999Z'],
      ['2022-11-10T03:40:00.000Z', '2022-11-10T23:59:59.999Z'],
      ['2023-10-01T04:31:00.000Z', '2023-10-01T23:59:59.999Z'],
      ['2023-10-03T04:59:00.000Z', '2023-10-03T23:59:59.999Z'],
    ])('setEndOfUTCDay %p', (input, expected) => {
      const result = setEndOfUTCDay(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      ['2023-10-01T03:00:00.000Z', '2023-10-01T00:00:00.000Z'],
      ['2023-10-11T03:40:00.000Z', '2023-10-11T00:00:00.000Z'],
      ['2021-10-01T04:31:00.000Z', '2021-10-01T00:00:00.000Z'],
      ['2023-11-01T04:59:00.000Z', '2023-11-01T00:00:00.000Z'],
    ])('setStartOfUTCDay %p', (input, expected) => {
      const result = setStartOfUTCDay(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      [1, ['2020-12-31T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [3, ['2020-12-29T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [7, ['2020-12-25T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [14, ['2020-12-18T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [30, ['2020-12-02T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [60, ['2020-11-02T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [90, ['2020-10-03T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
    ])('calculateDailyTrailingWindow with size of %p days', (size, [expectedFrom, expectedTo]) => {
      const [from, to] = calculateDailyTrailingWindow(size);
      expect(from.toISOString()).toEqual(expectedFrom);
      expect(to.toISOString()).toEqual(expectedTo);
    });
  });

  describe('testing weekly functions', () => {
    it.each([
      ['2021-10-01T03:00:00.000Z', '2021-10-03T23:59:59.999Z'],
      ['2023-11-04T02:40:00.000Z', '2023-11-05T23:59:59.999Z'],
      ['2022-12-29T04:31:00.000Z', '2023-01-01T23:59:59.999Z'],
      ['2022-10-31T04:59:00.000Z', '2022-11-06T23:59:59.999Z'],
    ])('setEndOfUTCWeek %p', (input, expected) => {
      const result = setEndOfUTCWeek(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      ['2023-10-30T03:00:00.000Z', '2023-10-30T00:00:00.000Z'],
      ['2023-10-29T03:40:00.000Z', '2023-10-23T00:00:00.000Z'],
      ['2023-01-01T04:31:00.000Z', '2022-12-26T00:00:00.000Z'],
      ['2023-10-27T04:59:00.000Z', '2023-10-23T00:00:00.000Z'],
      ['2023-10-23T04:59:00.000Z', '2023-10-23T00:00:00.000Z'],
    ])('setStartOfUTCWeek %p', (input, expected) => {
      const result = setStartOfUTCWeek(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      [1, ['2020-12-21T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [4, ['2020-11-30T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [8, ['2020-11-02T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [12, ['2020-10-05T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [24, ['2020-07-13T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
    ])('calculateWeeklyTrailingWindow with size of %p weeks', (size, [expectedFrom, expectedTo]) => {
      const [from, to] = calculateWeeklyTrailingWindow(size);
      expect(from.toISOString()).toEqual(expectedFrom);
      expect(to.toISOString()).toEqual(expectedTo);
    });
  });

  describe('testing monthly functions', () => {
    it.each([
      ['2023-10-01T03:00:00.000Z', '2023-10-31T23:59:59.999Z'],
      ['2023-10-18T02:40:00.000Z', '2023-10-31T23:59:59.999Z'],
      ['2022-12-29T04:31:00.000Z', '2022-12-31T23:59:59.999Z'],
      ['2023-10-31T04:59:00.000Z', '2023-10-31T23:59:59.999Z'],
      ['2016-02-20T04:59:00.000Z', '2016-02-29T23:59:59.999Z'],
      ['2016-02-29T04:59:00.000Z', '2016-02-29T23:59:59.999Z'],
      ['2017-02-24T04:59:00.000Z', '2017-02-28T23:59:59.999Z'],
    ])('setEndOfUTCMonth %p', (input, expected) => {
      const result = setEndOfUTCMonth(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      ['2023-10-30T03:00:00.000Z', '2023-10-01T00:00:00.000Z'],
      ['2023-10-29T03:40:00.000Z', '2023-10-01T00:00:00.000Z'],
      ['2023-01-01T04:31:00.000Z', '2023-01-01T00:00:00.000Z'],
      ['2023-10-27T04:59:00.000Z', '2023-10-01T00:00:00.000Z'],
      ['2023-10-23T04:59:00.000Z', '2023-10-01T00:00:00.000Z'],
    ])('setStartOfUTCMonth %p', (input, expected) => {
      const result = setStartOfUTCMonth(new Date(input));
      expect(result.toISOString()).toEqual(expected);
    });

    it.each([
      [1, ['2020-12-01T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [4, ['2020-09-01T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [6, ['2020-07-01T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [9, ['2020-04-01T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
      [12, ['2020-01-01T00:00:00.000Z', '2021-01-01T23:59:59.999Z']],
    ])('calculateMonthlyTrailingWindow with size of %p months', (size, [expectedFrom, expectedTo]) => {
      const [from, to] = calculateMonthlyTrailingWindow(size);
      expect(from.toISOString()).toEqual(expectedFrom);
      expect(to.toISOString()).toEqual(expectedTo);
    });
  });

  it('openEndDateRangeTransformer', () => {
    const openDateRange = openEndDateRangeTransformer({ from: 1717200000000, to: 1717804800000 });
    expect(openDateRange).toStrictEqual({ from: 1717200000000, to: 1717804799999 });
  });

  it.each([
    ['2024-07-16T22:10:00.000Z', TimePeriod.Pt1H, '2024-07-16T21:00:00.000Z'],
    ['2024-07-16T22:00:00.000Z', TimePeriod.P1D, '2024-07-15T00:00:00.000Z'],
    ['2024-07-16T12:00:00.000Z', TimePeriod.P1W, '2024-07-08T00:00:00.000Z'],
    ['2024-07-10T12:00:00.000Z', TimePeriod.P1M, '2024-06-01T00:00:00.000Z'],
  ])('calculate start of previous profile from %p for %p batch frequency', (inputDate, batchFrequency, expected) => {
    const previousProfileStart = setStartOfPreviousProfile(batchFrequency)(inputDate);
    expect(previousProfileStart.toISOString()).toEqual(expected);
  });

  it.each([
    ['2024-07-16T22:10:00.000Z', TimePeriod.Pt1H, '2024-07-16T21:59:59.999Z'],
    ['2024-07-16T22:00:00.000Z', TimePeriod.P1D, '2024-07-15T23:59:59.999Z'],
    ['2024-07-16T12:00:00.000Z', TimePeriod.P1W, '2024-07-14T23:59:59.999Z'],
    ['2024-07-10T12:00:00.000Z', TimePeriod.P1M, '2024-06-30T23:59:59.999Z'],
  ])('calculate end of previous profile from %p for %p batch frequency', (inputDate, batchFrequency, expected) => {
    const previousProfileStart = setEndOfPreviousProfile(batchFrequency)(inputDate);
    expect(previousProfileStart.toISOString()).toEqual(expected);
  });
});
