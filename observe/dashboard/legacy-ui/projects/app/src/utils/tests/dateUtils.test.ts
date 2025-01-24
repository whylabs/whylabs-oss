import { differenceInDays } from 'date-fns';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import { TimePeriod } from 'generated/graphql';
import {
  addNDays,
  formatDateTimeNumber,
  getBucketsForEachWholeUnit,
  getDateBuckets,
  getDateUnitLength,
  getDaysTimestampList,
  getFormattedDateRangeString,
  getMonthsTimestampList,
  getWeeksTimestampList,
  parseDateWithFallback,
  timeShort,
} from '../dateUtils';
import { calculateDailyTrailingWindow } from '../batchProfileUtils';
import { SimpleDateRange } from '../dateRangeUtils';

describe('Testing getFormattedDateRangeString', () => {
  it('testing with 2 different dates', () => {
    const result = getFormattedDateRangeString({ from: 1689552000000, to: 1690243199999 });
    expect(result).toEqual('(07/17/2023 - 07/24/2023)');
  });

  it('testing with equal dates', () => {
    const result = getFormattedDateRangeString({ from: 1689552000000, to: 1689552000000 });
    expect(result).toEqual('(07/17/2023)');
  });

  it('testing with `from` invalid date', () => {
    const result = getFormattedDateRangeString({ from: 0, to: 1690243199999 });
    expect(result).toEqual('(07/24/2023)');
  });

  it('testing with `to` invalid date', () => {
    const result = getFormattedDateRangeString({ from: 1689552000000, to: 0 });
    expect(result).toEqual('(07/17/2023)');
  });

  it('testing with both invalid date', () => {
    const result = getFormattedDateRangeString({ from: 0, to: 0 });
    expect(result).toEqual('-');
  });

  it('testing with equal dates without parentheses', () => {
    const result = getFormattedDateRangeString({ from: 1689552000000, to: 1689552000000 }, false);
    expect(result).toEqual('07/17/2023');
  });

  it('testing with 2 different dates without parentheses', () => {
    const result = getFormattedDateRangeString({ from: 1689552000000, to: 1690243199999 }, false);
    expect(result).toEqual('07/17/2023 - 07/24/2023');
  });
});

describe('Add days date-fns wrapper tests', () => {
  it.each([
    ['Testing D+ 1', 1685393028113, 1, 1685479428113],
    ['Testing D+0', 1685393028113, 0, 1685393028113],
    ['Testing D+(-1)', 1685393028113, -1, 1685306628113], // subtract 1 day
  ])('%p with addNDays', (_, inputDate, numToAdd, expected) => {
    const result = addNDays(inputDate, numToAdd);
    expect(result.getTime()).toEqual(expected);
  });
});
describe('Date bucketing utility function tests', () => {
  it('gets the expected range for presets', () => {
    const [from, to] = calculateDailyTrailingWindow(14);
    const now = new Date();
    const simpleRange = { from: from.getTime(), to: to.getTime() };
    expect(getDateUnitLength(simpleRange, 'D')).toEqual(14);
    const twoWeekDayBuckets = getDateBuckets(simpleRange);
    expect(twoWeekDayBuckets.length).toEqual(15); // 15 because it also has to include last date bucket
    expect(differenceInDays(now, twoWeekDayBuckets[14].from)).toBeLessThan(1);
  });

  it('compresses large numbers of potential buckets to a reasonable level', () => {
    const [from, to] = calculateDailyTrailingWindow(14);
    const simpleRange = { from: from.getTime(), to: to.getTime() };
    // 14 days ago + today is 15*24 = 360 hours which I'm asking to be smooshed into
    // approximately 10 buckets.
    const hours = getDateUnitLength(simpleRange, 'H');
    // Daylight savings might shift the daterange by an hour
    expect(hours === 359 || hours === 360 || hours === 361).toBeTruthy();
    const twoWeekHourBuckets = getDateBuckets(simpleRange, 10, 'H');
    expect(twoWeekHourBuckets.length).toBeLessThan(10 * 1.25);
  });

  it('compresses things according to natural defaults', () => {
    const [from, to] = calculateDailyTrailingWindow(60);
    const simpleRange = { from: from.getTime(), to: to.getTime() };
    const twoMonthDailyBuckets = getDateBuckets(simpleRange);
    // 36 is the default max.
    expect(twoMonthDailyBuckets.length).toBeLessThan(36 * 1.25);
    const totalBucketDistance =
      twoMonthDailyBuckets[twoMonthDailyBuckets.length - 1].to.getTime() - twoMonthDailyBuckets[0].from.getTime();
    const twoMonthsInMillis = ONE_DAY_IN_MILLIS * 60;
    expect(Math.floor(Math.abs(totalBucketDistance - twoMonthsInMillis) / ONE_DAY_IN_MILLIS)).toBeLessThanOrEqual(1);
  });

  it('Getting date bucket for each unit includes ending date', () => {
    const dateRange: SimpleDateRange = {
      from: 1634083200000, // Wed Oct 13 2021
      to: 1634860800000, // Fri Oct 22 2021/
    };

    const dateBuckets = getBucketsForEachWholeUnit(dateRange);
    const lastDateBucket = dateBuckets[dateBuckets.length - 1];

    expect(lastDateBucket.from.valueOf() === dateRange.to.valueOf());
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

  describe('timeShort', () => {
    it('returns the expected short time', () => {
      expect(timeShort(1627332380000)).toBe('07/26');
    });

    it.each([
      ['07/26', 1627332380000, TimePeriod.P1D],
      ['08/06/2021', 1628218800000, TimePeriod.P1M],
      ['08/06', 1628218800000, TimePeriod.P1W],
      ['08/06 03:00 UTC', 1628218800000, TimePeriod.Pt1H],
      ['02/12 20:46 UTC', 1581540380000, TimePeriod.Pt1H],
      ['06/05', 1433532080000, TimePeriod.Unknown],
      ['09/05', 1441480880000, TimePeriod.All],
    ])('returns the expected short time %p for a date %p and period %p', (expected, time, period) => {
      expect(timeShort(time, period)).toEqual(expected);
    });
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

  describe('getDaysTimestampList', () => {
    it.each([
      [new Date('Wed Aug 5 2020'), new Date('Wed Aug 5 2020'), ['08/05']],
      [
        new Date('Wed Oct 13 2021'),
        new Date('Fri Oct 22 2021'),
        ['10/13', '10/14', '10/15', '10/16', '10/17', '10/18', '10/19', '10/20', '10/21', '10/22'],
      ],
      [
        1627332380000,
        1628218800000,
        ['07/26', '07/27', '07/28', '07/29', '07/30', '07/31', '08/01', '08/02', '08/03', '08/04', '08/05'],
      ],
    ])('returns expected list for each day in the range %p and %p', (from, to, expected) => {
      const daysTimestampList = getDaysTimestampList(from, to);
      expect(daysTimestampList.map((time) => timeShort(time, TimePeriod.P1D))).toStrictEqual(expected);
    });
  });

  describe('getWeeksTimestampList', () => {
    it.each([
      [new Date('Wed Aug 5 2020'), new Date('Wed Aug 5 2020'), ['08/03']],
      [
        new Date('Mon Dec 7 2020'),
        new Date('Wed Mar 24 2021'),
        [
          '12/07',
          '12/14',
          '12/21',
          '12/28',
          '01/04',
          '01/11',
          '01/18',
          '01/25',
          '02/01',
          '02/08',
          '02/15',
          '02/22',
          '03/01',
          '03/08',
          '03/15',
          '03/22',
        ],
      ],
      [1627332380000, 1628458852000, ['07/26', '08/02']],
    ])('returns expected list for each week in the range %p and %p', (from, to, expected) => {
      const weeksTimestampList = getWeeksTimestampList(from, to);
      expect(weeksTimestampList.map((time) => timeShort(time, TimePeriod.P1W))).toStrictEqual(expected);
    });
  });

  describe('getMonthsTimestampList', () => {
    it.each([
      [new Date('Wed Aug 5 2020'), new Date('Wed Aug 5 2020'), ['08/01/2020']],
      [
        new Date('Mon Dec 7 2020'),
        new Date('Wed Mar 24 2021'),
        ['12/01/2020', '01/01/2021', '02/01/2021', '03/01/2021'],
      ],
      [1627332380000, 1628458852000, ['07/01/2021', '08/01/2021']],
    ])('returns expected list for each month in the range %p and %p', (from, to, expected) => {
      const monthsTimestampList = getMonthsTimestampList(from, to);
      expect(monthsTimestampList.map((time) => timeShort(time, TimePeriod.P1M))).toStrictEqual(expected);
    });
  });
});
