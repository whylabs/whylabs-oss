import { scaleTime } from '@visx/scale';
import { ScaleTime } from 'd3-scale';
import { differenceInDays, differenceInHours } from 'date-fns';
import { DatedData } from 'types/graphTypes';
import { ONE_DAY_IN_MILLIS, ONE_HOUR_IN_MILLIS, ONE_WEEK_IN_MILLIS } from 'ui/constants';
import { TimePeriod } from 'generated/graphql';
import {
  generateDatedXScale,
  generateGraphYRangeWithParameters,
  generateXTicks,
  generateYBoundsFromData,
  MAX_X_TICKS,
} from '../scaleUtils';

function makeTestTimescale(start: Date, end: Date) {
  return scaleTime({
    range: [0, 1],
    round: true,
    domain: [start, end],
  });
}

function makeTestNumberOfDays(startTime: number, days: number) {
  let nextTime = startTime;
  let day = 0;
  const ticksInMillis: number[] = [];
  while (day < days) {
    ticksInMillis.push(nextTime);
    nextTime += ONE_DAY_IN_MILLIS;
    day += 1;
  }
  return ticksInMillis;
}

function makeTestIntervals(startTime: number, interval: number, items: number): number[] {
  if (interval <= 0) {
    return [];
  }
  const ticksInMillis: number[] = [];
  let nextTime = startTime;
  let step = 0;
  while (step < items) {
    ticksInMillis.push(nextTime);
    nextTime += interval;
    step += 1;
  }
  return ticksInMillis;
}

function timestampsToDatedData(timestamps: number[]): DatedData[] {
  return timestamps.map((ts) => ({ dateInMillis: ts }));
}

function checkCreatedIntervals(timeScale: ScaleTime<number, number, never>, startTime: number) {
  const days = differenceInDays(timeScale.domain()[1], timeScale.domain()[0]);
  const ticksInMillis = makeTestNumberOfDays(startTime, days);
  const divider = Math.ceil(days / MAX_X_TICKS);
  let expectedDays = Math.ceil(days / divider) + 1;
  const xTicks = generateXTicks(timeScale, ticksInMillis, 1080);
  const expected = makeTestIntervals(startTime, ONE_DAY_IN_MILLIS * divider, expectedDays - 1);
  if (timeScale.domain()[1].getTime() - expected[expected.length - 1] > ONE_DAY_IN_MILLIS * divider - 1) {
    expected.push(timeScale.domain()[1].getTime());
  } else {
    expectedDays -= 1;
  }
  expect(xTicks?.length).toEqual(expectedDays);
  expect(xTicks).toEqual(expected);
}

describe('Testing graph scaling utitlities', () => {
  it('copies a simple set of dates', () => {
    const timeScale = makeTestTimescale(new Date(2021, 0, 1, 0, 0, 0), new Date(2021, 0, 5, 0, 0, 0));
    const startTime = new Date(2021, 0, 1, 0, 0, 0).getTime();
    checkCreatedIntervals(timeScale, startTime);
  });

  it('handles the dates being offset', () => {
    const timeScale = makeTestTimescale(new Date(2021, 0, 1, 17, 0, 0), new Date(2021, 0, 5, 17, 0, 0));
    const startTime = new Date(2021, 0, 1, 17, 0, 0).getTime();
    checkCreatedIntervals(timeScale, startTime);
  });

  it('filters to the correct number of days', () => {
    const timeScale = makeTestTimescale(new Date(2021, 0, 1, 17, 0, 0), new Date(2021, 3, 1, 17, 0, 0));
    const startTime = new Date(2021, 0, 1, 17, 0, 0).getTime();
    checkCreatedIntervals(timeScale, startTime);
  });

  it('handles a different interval size', () => {
    const timeScale = makeTestTimescale(new Date(2021, 0, 1, 12, 30, 0), new Date(2021, 0, 1, 23, 30, 0));
    const startTime = new Date(2021, 0, 1, 12, 30, 0).getTime();
    const xTicks = generateXTicks(timeScale, undefined, 1080, TimePeriod.Pt1H);
    const hours = differenceInHours(timeScale.domain()[1], timeScale.domain()[0]);

    const divider = Math.ceil(hours / MAX_X_TICKS);
    const expectedHours = Math.ceil(hours / divider) + 1;
    const expected = makeTestIntervals(startTime, ONE_HOUR_IN_MILLIS * divider, expectedHours);
    expect(xTicks?.length).toEqual(expectedHours);
    expect(xTicks).toEqual(expected);
  });
});

describe('Testing y-scale items', () => {
  it('handles the case where all items are the same', () => {
    const [minY, maxY] = generateYBoundsFromData([5, 5, 5, 5, 5, 5, 5], 0.2);
    expect(minY).toEqual(4);
    expect(maxY).toEqual(6);
  });
});

describe('Testing x-axis generation', () => {
  it('creates the expected axis given default input', () => {
    const startTime = new Date(Date.UTC(2022, 7, 15)).getTime();
    const endTime = new Date(Date.UTC(2022, 8, 12)).getTime();
    const data = timestampsToDatedData(makeTestIntervals(startTime, ONE_WEEK_IN_MILLIS, 5));
    const xScale = generateDatedXScale(data, 100, 0);
    expect(xScale.domain()[0].getTime()).toEqual(startTime);
    expect(xScale.domain()[1].getTime()).toEqual(endTime);
  });

  it('does not override the data range with partial date ranges', () => {
    const startTime = new Date(Date.UTC(2022, 7, 15)).getTime();
    const endTime = new Date(Date.UTC(2022, 8, 12)).getTime();
    const data = timestampsToDatedData(makeTestIntervals(startTime, ONE_WEEK_IN_MILLIS, 5));
    const xScale = generateDatedXScale(data, 100, 0, 0, [100, null]);
    expect(xScale.domain()[0].getTime()).toEqual(startTime);
    expect(xScale.domain()[1].getTime()).toEqual(endTime);
  });

  it('Overrides the data range with full date ranges', () => {
    const earlyStartTime = new Date(Date.UTC(2022, 7, 8)).getTime();
    const startTime = new Date(Date.UTC(2022, 7, 15)).getTime();
    // const endTime = new Date(Date.UTC(2022, 8, 12)).getTime();
    const lateEndTime = new Date(Date.UTC(2022, 8, 19)).getTime();

    const data = timestampsToDatedData(makeTestIntervals(startTime, ONE_WEEK_IN_MILLIS, 5));
    const xScale = generateDatedXScale(data, 100, 0, 0, [earlyStartTime, lateEndTime]);
    expect(xScale.domain()[0].getTime()).toEqual(earlyStartTime);
    expect(xScale.domain()[1].getTime()).toEqual(lateEndTime);
  });
});

describe('Testing y-Range generation', () => {
  const errorCallback = jest.fn();
  const yBufferRatio = 0.5;
  const minYRange = 0.2;
  const errorMessage = 'Attempting to graph a range with invalid parameters';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the data-provided range when it is valid and no bounds are provided', () => {
    const dataRange: [number, number] = [2, 6];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(1);
    expect(outputMax).toEqual(9);
  });

  it('respects the hard cap when the data itself fits within the range, but the buffers do not', () => {
    const dataRange: [number, number] = [2, 6];
    const suggestedRange: [number, number] = [2, 7];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      suggestedRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(2);
    expect(outputMax).toEqual(7);
  });

  it('handles a case with a negative min and max', () => {
    const dataRange: [number, number] = [-6, -2];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(-9);
    expect(outputMax).toEqual(-1);
  });

  it('handles a case with a negative min and positive max', () => {
    const dataRange: [number, number] = [-6, 2];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(-9);
    expect(outputMax).toEqual(3);
  });

  it('uses the relative range when it is smaller than the suggested range', () => {
    const dataRange: [number, number] = [2, 6];
    const suggestedRange: [number, number] = [0, 20];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      suggestedRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(1);
    expect(outputMax).toEqual(9);
  });

  it('correctly logs an error when the data range is invalid', () => {
    const dataRange: [number, number] = [6, 2];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).toHaveBeenCalledWith(errorMessage);
    expect(outputMin).toEqual(0);
    expect(outputMax).toEqual(1);
  });

  it('correctly logs an error when the suggested range is invalid', () => {
    const dataRange: [number, number] = [2, 6];
    const suggestedRange: [number, number] = [5, 4];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      suggestedRange,
      yBufferRatio,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).toHaveBeenCalledWith(errorMessage);
    expect(outputMin).toEqual(0);
    expect(outputMax).toEqual(1);
  });

  it('correctly logs an error when the minimum y range is invalid', () => {
    const dataRange: [number, number] = [2, 6];
    const suggestedRange: [number, number] = [2, 7];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      suggestedRange,
      yBufferRatio,
      minYRange: 0,
      errorCallback,
    });
    expect(errorCallback).toHaveBeenCalledWith(errorMessage);
    expect(outputMin).toEqual(0);
    expect(outputMax).toEqual(1);
  });

  it('correctly ignores silly yBufferRatio values', () => {
    const dataRange: [number, number] = [2, 6];
    const [outputMin, outputMax] = generateGraphYRangeWithParameters({
      dataRange,
      yBufferRatio: -1,
      minYRange,
      errorCallback,
    });
    expect(errorCallback).not.toHaveBeenCalled();
    expect(outputMin).toEqual(2);
    expect(outputMax).toEqual(6);
  });
});

describe('Testing y-range generation with customer-inspired input', () => {
  it('applies a range buffer when the data is very close together', () => {
    const values = [1.5, 1.500001, 1.500002, 1.500003, 1.500004, 1.500005];
    const axisBufferRatio = 0.05 / 4;
    const epsilonDivider = 1000;
    const [minY, maxY] = generateYBoundsFromData(values, axisBufferRatio, epsilonDivider);
    expect(maxY).toBeCloseTo(1.525, 4);
    expect(minY).toBeCloseTo(1.475, 4);
    expect(maxY - minY).toBeCloseTo(0.05, 4);
  });
});
