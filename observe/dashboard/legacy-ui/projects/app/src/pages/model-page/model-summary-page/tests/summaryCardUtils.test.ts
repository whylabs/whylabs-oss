import { TimePeriod } from 'generated/graphql';
import {
  getMidRangeFromBatchFrequencyAndShortRange,
  getPrevBatchTimestamps,
  getSimpleLastNUnitBuckets,
} from '../summaryCardUtils';

// This is Friday, March 17, 2023 at 5:30:01 PM in NEW YORK -- which was in EDT at that date/time
const ST_PADDY_2023_NY = new Date('2023-03-17T17:30:01.000-04:00');
const UTC_NEW_YEAR = new Date('2023-01-01T00:00:00.000-00:00');
const UTC_APRIL_START = new Date('2023-04-01T00:00:00.000-00:00');

describe('Ensuring that our time range functions are getting the values we think they are', () => {
  it('gets the expected previous hour', () => {
    const startOneHourBack = new Date('2023-03-17T16:00:00.000-04:00');
    const endOneHourBack = new Date('2023-03-17T17:00:00.000-04:00');

    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.Pt1H,
    );
    expect(new Date(oldBatch.prevBatchStartTimestamp).toISOString()).toEqual(startOneHourBack.toISOString());
    expect(new Date(oldBatch.prevBatchEndTimestamp).toISOString()).toEqual(endOneHourBack.toISOString());
  });

  it('gets the expected previous day', () => {
    const startOneDayBack = new Date('2023-03-16T00:00:00.000-00:00');
    const endOneDayBack = new Date('2023-03-17T00:00:00.000-00:00');

    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.P1D,
    );
    expect(new Date(oldBatch.prevBatchStartTimestamp).toISOString()).toEqual(startOneDayBack.toISOString());
    expect(new Date(oldBatch.prevBatchEndTimestamp).toISOString()).toEqual(endOneDayBack.toISOString());
  });

  it('gets the expected previous week', () => {
    const startOneWeekBack = new Date('2023-03-06T00:00:00.000-00:00');
    const endOneWeekBack = new Date('2023-03-13T00:00:00.000-00:00');

    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.P1W,
    );
    expect(new Date(oldBatch.prevBatchStartTimestamp).toUTCString()).toEqual(startOneWeekBack.toUTCString());
    expect(new Date(oldBatch.prevBatchEndTimestamp).toUTCString()).toEqual(endOneWeekBack.toUTCString());
  });

  it('gets the expected previous month', () => {
    const startOneMonthBack = new Date('2023-02-01T00:00:00.000-00:00');
    const endOneMonthBack = new Date('2023-03-01T00:00:00.000-00:00');

    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.P1M,
    );
    expect(new Date(oldBatch.prevBatchStartTimestamp).toUTCString()).toEqual(startOneMonthBack.toUTCString());
    expect(new Date(oldBatch.prevBatchEndTimestamp).toUTCString()).toEqual(endOneMonthBack.toUTCString());
  });

  it('gets the expected mid range from an hourly batch', () => {
    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.Pt1H,
    );
    const startTwentyFourHoursBack = new Date('2023-03-16T17:00:00.000-04:00');

    const midRange = getMidRangeFromBatchFrequencyAndShortRange(
      { from: oldBatch.prevBatchStartTimestamp, to: oldBatch.prevBatchEndTimestamp },
      TimePeriod.Pt1H,
    );
    expect(new Date(midRange.from).toUTCString()).toEqual(startTwentyFourHoursBack.toUTCString());
    expect(new Date(midRange.to).toUTCString()).toEqual(new Date(oldBatch.prevBatchEndTimestamp).toUTCString());
  });

  it('gets the expected mid range from a daily batch', () => {
    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.P1D,
    );
    const startSevenDaysBack = new Date('2023-03-10T00:00:00.000-00:00');

    const midRange = getMidRangeFromBatchFrequencyAndShortRange(
      { from: oldBatch.prevBatchStartTimestamp, to: oldBatch.prevBatchEndTimestamp },
      TimePeriod.P1D,
    );
    expect(new Date(midRange.from).toUTCString()).toEqual(startSevenDaysBack.toUTCString());
    expect(new Date(midRange.to).toUTCString()).toEqual(new Date(oldBatch.prevBatchEndTimestamp).toUTCString());
  });

  it('gets the expected mid range from a weekly batch', () => {
    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: ST_PADDY_2023_NY.getTime() },
      TimePeriod.P1W,
    );
    const startFourWeeksBack = new Date('2023-02-13T00:00:00.000-00:00');

    const midRange = getMidRangeFromBatchFrequencyAndShortRange(
      { from: oldBatch.prevBatchStartTimestamp, to: oldBatch.prevBatchEndTimestamp },
      TimePeriod.P1W,
    );
    expect(new Date(midRange.from).toUTCString()).toEqual(startFourWeeksBack.toUTCString());
    expect(new Date(midRange.to).toUTCString()).toEqual(new Date(oldBatch.prevBatchEndTimestamp).toUTCString());
  });

  it('gets the expected mid range from a monthly batch', () => {
    const oldBatch = getPrevBatchTimestamps(
      { from: UTC_NEW_YEAR.getTime(), to: UTC_APRIL_START.getTime() },
      TimePeriod.P1M,
    );
    const startThreeMonthsBack = new Date('2022-12-01T00:00:00.000-00:00');

    const midRange = getMidRangeFromBatchFrequencyAndShortRange(
      { from: oldBatch.prevBatchStartTimestamp, to: oldBatch.prevBatchEndTimestamp },
      TimePeriod.P1M,
    );
    expect(new Date(midRange.from).toUTCString()).toEqual(startThreeMonthsBack.toUTCString());
    expect(new Date(midRange.to).toUTCString()).toEqual(new Date(oldBatch.prevBatchEndTimestamp).toUTCString());
  });
});

describe('Testing the variable length unit-bucket logic', () => {
  it('Handles getting the hour units as expected', () => {
    const lastFourBuckets = getSimpleLastNUnitBuckets(4, ST_PADDY_2023_NY, TimePeriod.Pt1H);
    const expectedLastFourBuckets = [
      new Date('2023-03-17T16:59:59.999-04:00').getTime(),
      new Date('2023-03-17T16:00:00.000-04:00').getTime(),
      new Date('2023-03-17T15:00:00.000-04:00').getTime(),
      new Date('2023-03-17T14:00:00.000-04:00').getTime(),
      new Date('2023-03-17T13:00:00.000-04:00').getTime(),
    ].reverse();
    expect(lastFourBuckets).toEqual(expectedLastFourBuckets);
  });

  it('Handles getting the day units as expected', () => {
    const lastFourBuckets = getSimpleLastNUnitBuckets(4, ST_PADDY_2023_NY, TimePeriod.P1D);
    const expectedLastFourBuckets = [
      new Date('2023-03-16T23:59:59.999+00:00').getTime(),
      new Date('2023-03-16T00:00:00.000+00:00').getTime(),
      new Date('2023-03-15T00:00:00.000+00:00').getTime(),
      new Date('2023-03-14T00:00:00.000+00:00').getTime(),
      new Date('2023-03-13T00:00:00.000+00:00').getTime(),
    ].reverse();
    expect(lastFourBuckets).toEqual(expectedLastFourBuckets);
  });

  it('Handles getting the week units as expected', () => {
    const lastThreeBuckets = getSimpleLastNUnitBuckets(3, ST_PADDY_2023_NY, TimePeriod.P1W);
    const expectedLastThreeBuckets = [
      new Date('2023-03-12T23:59:59.999+00:00').getTime(),
      new Date('2023-03-06T00:00:00.000+00:00').getTime(),
      new Date('2023-02-27T00:00:00.000+00:00').getTime(),
      new Date('2023-02-20T00:00:00.000+00:00').getTime(),
    ].reverse();
    expect(lastThreeBuckets).toEqual(expectedLastThreeBuckets);
  });

  it('Handles getting the week units as expected', () => {
    const lastfiveBuckets = getSimpleLastNUnitBuckets(5, ST_PADDY_2023_NY, TimePeriod.P1M);
    const expectedLastFiveBuckets = [
      new Date('2023-02-28T23:59:59.999+00:00').getTime(),
      new Date('2023-02-01T00:00:00.000+00:00').getTime(),
      new Date('2023-01-01T00:00:00.000+00:00').getTime(),
      new Date('2022-12-01T00:00:00.000+00:00').getTime(),
      new Date('2022-11-01T00:00:00.000+00:00').getTime(),
      new Date('2022-10-01T00:00:00.000+00:00').getTime(),
    ].reverse();
    expect(lastfiveBuckets).toEqual(expectedLastFiveBuckets);
  });
});
