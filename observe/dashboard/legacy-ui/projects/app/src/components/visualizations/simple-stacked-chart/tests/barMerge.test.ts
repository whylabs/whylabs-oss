import { mergeBars, mergeBucket, createBuckets } from '../barMerge';
import { StackedBar } from '../types';

const FIXED_START_DATE = new Date('2023-01-01T00:00:00.000Z');

function addUtcDay(date: Date, days = 1) {
  return new Date(new Date(date).setUTCDate(date.getUTCDate() + days));
}

function getStackedBarSample(count: number) {
  const stackedBars: StackedBar[] = [];
  for (let i = 0; i < count; i += 1) {
    const nextBar = {
      from: new Date(new Date(FIXED_START_DATE).setUTCDate(FIXED_START_DATE.getUTCDate() + i)),
      to: new Date(new Date(FIXED_START_DATE).setUTCDate(FIXED_START_DATE.getUTCDate() + i + 1)),
      counts: {
        A: { count: i + 1, color: 'red' },
        B: { count: i + 2, color: 'blue' },
        C: { count: i + 3, color: 'green' },
        D: { count: i + 4, color: 'yellow' },
      },
    };
    stackedBars.push(nextBar);
  }
  return stackedBars;
}

describe('mergeBars', () => {
  it('returns the original array if mergeNumber is 1', () => {
    const stackedBars = getStackedBarSample(3);
    expect(mergeBars(stackedBars, 1)).toEqual(stackedBars);
  });

  it('merges bars correctly', () => {
    const stackedBars = getStackedBarSample(8);
    const mergeNumber = 3;
    const mergedBars = mergeBars(stackedBars, mergeNumber);
    expect(mergedBars.length).toEqual(3);
    expect(mergedBars[0].from).toEqual(FIXED_START_DATE);
    expect(mergedBars[0].to).toEqual(stackedBars[2].to);
    expect(mergedBars[0].counts).toEqual({
      A: { count: 6, color: 'red' },
      B: { count: 9, color: 'blue' },
      C: { count: 12, color: 'green' },
      D: { count: 15, color: 'yellow' },
    });

    expect(mergedBars[2].from).toEqual(stackedBars[6].from);
    expect(mergedBars[2].to).toEqual(stackedBars[7].to);
    expect(mergedBars[2].counts).toEqual({
      A: { count: stackedBars[6].counts.A.count + stackedBars[7].counts.A.count, color: 'red' },
      B: { count: stackedBars[6].counts.B.count + stackedBars[7].counts.B.count, color: 'blue' },
      C: { count: stackedBars[6].counts.C.count + stackedBars[7].counts.C.count, color: 'green' },
      D: { count: stackedBars[6].counts.D.count + stackedBars[7].counts.D.count, color: 'yellow' },
    });
  });
});

describe('mergeBucket', () => {
  it('should merge a bucket of stacked bars correctly', () => {
    const bucket: StackedBar[] = getStackedBarSample(3);
    const mergedBucket = mergeBucket(bucket);

    const expectedEndDate = new Date(new Date(FIXED_START_DATE).setUTCDate(FIXED_START_DATE.getUTCDate() + 3));

    expect(mergedBucket).toEqual({
      from: FIXED_START_DATE,
      to: expectedEndDate,
      counts: {
        A: { count: 6, color: 'red' },
        B: { count: 9, color: 'blue' },
        C: { count: 12, color: 'green' },
        D: { count: 15, color: 'yellow' },
      },
    });
  });

  it('merges bars that are missing categories', () => {
    const bucket: StackedBar[] = [
      {
        from: addUtcDay(FIXED_START_DATE, 0),
        to: addUtcDay(FIXED_START_DATE, 1),
        counts: {
          A: { count: 1, color: 'red' },
          C: { count: 3, color: 'green' },
        },
      },
      {
        from: addUtcDay(FIXED_START_DATE, 1),
        to: addUtcDay(FIXED_START_DATE, 2),
        counts: {
          B: { count: 2, color: 'blue' },
          C: { count: 3, color: 'green' },
          D: { count: 4, color: 'yellow' },
        },
      },
    ];
    const mergedBucket = mergeBucket(bucket);
    expect(mergedBucket).toEqual({
      from: FIXED_START_DATE,
      to: addUtcDay(FIXED_START_DATE, 2),
      counts: {
        A: { count: 1, color: 'red' },
        B: { count: 2, color: 'blue' },
        C: { count: 6, color: 'green' },
        D: { count: 4, color: 'yellow' },
      },
    });
  });
});

describe('createBuckets', () => {
  it('should create buckets of stacked bars correctly when the merge ratio is a divisor', () => {
    const stackedBars = getStackedBarSample(8);
    const mergeNumber = 2;
    const buckets = createBuckets(stackedBars, mergeNumber);

    expect(buckets.length).toEqual(4);
    expect(buckets[0]).toEqual([stackedBars[0], stackedBars[1]]);
    expect(buckets[1]).toEqual([stackedBars[2], stackedBars[3]]);
    expect(buckets[2]).toEqual([stackedBars[4], stackedBars[5]]);
    expect(buckets[3]).toEqual([stackedBars[6], stackedBars[7]]);
  });

  it('creates buckets correctly when there are some dangling items at the end', () => {
    const stackedBars = getStackedBarSample(20);
    const mergeNumber = 6;
    const buckets = createBuckets(stackedBars, mergeNumber);
    expect(buckets.length).toEqual(4);
    expect(buckets[0].length).toEqual(6);
    expect(buckets[1]).toEqual([
      stackedBars[6],
      stackedBars[7],
      stackedBars[8],
      stackedBars[9],
      stackedBars[10],
      stackedBars[11],
    ]);
    expect(buckets[2].length).toEqual(6);
    expect(buckets[3]).toEqual([stackedBars[18], stackedBars[19]]);
  });
});
