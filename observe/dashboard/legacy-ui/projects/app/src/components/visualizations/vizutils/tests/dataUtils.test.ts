import { TimePeriod } from 'generated/graphql';
import { DatedData, MetricSeriesData, TimestampedData } from 'types/graphTypes';
import {
  clipNumericTimestampData,
  generateEqualLengthEventArray,
  generateUnionArrays,
  sortIfNecessary,
} from '../dataUtils';

const BASE_TIME = 1643673600000;
const ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24;

function generateDated(count: number, dateOffset: number, skipIndices: number[] = [], timeOffset = 0) {
  const start = BASE_TIME + dateOffset * ONE_DAY_IN_MILLIS + timeOffset;
  const output: DatedData[] = [];
  for (let i = 0; i < count; i += 1) {
    if (!skipIndices.includes(i)) {
      output.push({ dateInMillis: start + i * ONE_DAY_IN_MILLIS });
    }
  }
  return output;
}

function generateDateRangeDays(quantity: number, offset: number): [number, number] {
  if (quantity <= 0) {
    return [0, 0];
  }
  const start = BASE_TIME + ONE_DAY_IN_MILLIS * offset;
  let end = start;
  for (let i = 0; i < quantity; i += 1) {
    end += ONE_DAY_IN_MILLIS;
  }
  return [start, end];
}

function generateTimestamped(count: number, dateOffset: number, skipIndices: number[] = [], timeOffset = 0) {
  const start = BASE_TIME + dateOffset * ONE_DAY_IN_MILLIS + timeOffset;
  const output: TimestampedData[] = [];
  for (let i = 0; i < count; i += 1) {
    if (!skipIndices.includes(i)) {
      output.push({ timestamp: start + i * ONE_DAY_IN_MILLIS });
    }
  }
  return output;
}

describe('Testing our sorting logic', () => {
  it('Does nothing to data that is correctly sorted', () => {
    const fiveDatedDays = generateDated(5, 0);
    const originalCopy = fiveDatedDays.slice();
    sortIfNecessary(fiveDatedDays);
    expect(fiveDatedDays).toEqual(originalCopy);
  });

  it('Sorts data in place if it is necessary', () => {
    const threeDays = generateTimestamped(3, 0);
    const originalCopy = threeDays.slice();
    const reversed = threeDays.reverse();
    sortIfNecessary(reversed);
    expect(reversed).toEqual(originalCopy);
  });

  it('Does not cause errors with empty or length-1 data', () => {
    const noDates = generateDated(0, 0);
    const oneDate = generateDated(1, 0);
    const noCopy = noDates.slice();
    const oneCopy = oneDate.slice();
    sortIfNecessary(noDates);
    sortIfNecessary(oneDate);
    expect(noDates).toEqual(noCopy);
    expect(oneDate).toEqual(oneCopy);
  });
});

describe('Testing the new union array function', () => {
  it('matches the easy case of 1-1', () => {
    const fiveDatedDays = generateDated(5, 0);
    const fiveStampedDays = generateTimestamped(5, 0);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays(
      fiveDatedDays,
      fiveStampedDays,
      generateDateRangeDays(5, 0),
    );
    expect(datedData.length).toEqual(5);
    expect(alignedData.length).toEqual(5);
    expect(alignedEvents.length).toEqual(5);

    fiveDatedDays.forEach((item, idx) => {
      expect(datedData[idx]?.dateInMillis).toEqual(item.dateInMillis);
      expect(alignedData[idx]?.dateInMillis).toEqual(item.dateInMillis);
      expect(alignedEvents[idx]?.timestamp).toEqual(item.dateInMillis);
    });
  });

  it('is not troubled by small time mismatches', () => {
    const fiveDatedDays = generateDated(5, 0);
    const fiveStampedDays = generateTimestamped(5, 0, [], 1000 * 60 * 60);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays<DatedData, TimestampedData>(
      fiveDatedDays,
      fiveStampedDays,
      generateDateRangeDays(5, 0),
    );
    expect(datedData.length).toEqual(5);
    expect(alignedData.length).toEqual(5);
    expect(alignedEvents.length).toEqual(5);

    fiveDatedDays.forEach((item, idx) => {
      expect(datedData[idx]?.dateInMillis).toEqual(item.dateInMillis);
      expect(alignedData[idx]?.dateInMillis).toEqual(item.dateInMillis);
      expect(alignedEvents[idx]?.timestamp).toEqual(alignedEvents[idx]?.timestamp);
    });
  });

  it('handles a simple case with no DQEs', () => {
    const threeDatedDays = generateDated(3, 0);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays<DatedData, TimestampedData>(
      threeDatedDays,
      [],
      generateDateRangeDays(3, 0),
    );
    expect(alignedData.length).toEqual(threeDatedDays.length);
    expect(datedData.length).toEqual(threeDatedDays.length);
    expect(alignedEvents).toEqual([null, null, null]);
    alignedData.forEach((datum, idx) => {
      expect(datum?.dateInMillis).toEqual(threeDatedDays[idx].dateInMillis);
      expect(datedData[idx].dateInMillis).toEqual(datum?.dateInMillis);
    });
  });

  it('returns empty when there is no data', () => {
    const threeStampedDays = generateTimestamped(3, 0);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays<DatedData, TimestampedData>(
      [],
      threeStampedDays,
      generateDateRangeDays(3, 0),
    );
    expect(datedData).toEqual([]);
    expect(alignedData).toEqual([]);
    expect(alignedEvents).toEqual([]);
  });

  it('overwrites DQE timestamps when they differ from the Data timestamps', () => {
    const days = [
      { dateInMillis: 1637712000000 },
      { dateInMillis: 1637798400000 },
      // { dateInMillis: 1637884800000 }, -- deliberately omitted
      { dateInMillis: 1637971200000 },
    ];
    const dqes = [
      { timestamp: 1637712500000 },
      { timestamp: 1637798900000 },
      { timestamp: 1637885300000 },
      { timestamp: 1637971700000 },
    ];
    const { datedData, alignedData, alignedEvents } = generateUnionArrays<DatedData, TimestampedData>(
      days,
      dqes,
      [1637712000000, 1638057600000],
      TimePeriod.P1D,
    );
    expect(datedData.length).toEqual(4);
    expect(alignedData.length).toEqual(4);
    expect(alignedData[2]).toBeNull();
    expect(alignedEvents.length).toEqual(4);
    expect(alignedData[0]?.dateInMillis).toEqual(days[0].dateInMillis);
    expect(datedData[0].dateInMillis).toEqual(days[0].dateInMillis);
    alignedEvents.forEach((ae, index) => {
      expect(ae?.timestamp).toEqual(datedData[index].dateInMillis);
    });
  });

  it('handles the case where the DQEs start earlier than the Data and run off the end', () => {
    const fourDatedDays = generateDated(4, 2);
    const twentyTimeStampsOneDayEarly = generateTimestamped(20, 1);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays<DatedData, TimestampedData>(
      fourDatedDays,
      twentyTimeStampsOneDayEarly,
      generateDateRangeDays(20, 0),
    );
    expect(datedData.length).toEqual(20);
    expect(alignedData.length).toEqual(20);
    expect(alignedData[2]?.dateInMillis).toEqual(datedData[2].dateInMillis);
    expect(alignedData[2]?.dateInMillis).toEqual(fourDatedDays[0].dateInMillis);
    expect(alignedEvents.length).toEqual(20);
    expect(alignedData.filter((d) => !!d).length).toEqual(4);
    expect(alignedEvents[19]?.timestamp).toEqual(datedData[19].dateInMillis);
    expect(alignedEvents[19]?.timestamp).toEqual(twentyTimeStampsOneDayEarly[18].timestamp);
    expect(alignedEvents[0]).toBeNull();
  });

  it('inputs null items when there is no matching value', () => {
    const fiveDatedDays = generateDated(5, 0);
    const noOdds = generateTimestamped(5, 0, [1, 3]);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays(
      fiveDatedDays,
      noOdds,
      generateDateRangeDays(5, 0),
    );
    expect(datedData.length).toEqual(fiveDatedDays.length);
    expect(alignedData.length).toEqual(fiveDatedDays.length);
    expect(alignedEvents[1]).toBeNull();
    expect(alignedEvents[3]).toBeNull();
    expect(alignedEvents[0]?.timestamp).toEqual(noOdds[0].timestamp);
    expect(alignedEvents[2]?.timestamp).toEqual(noOdds[1].timestamp);
    expect(alignedEvents[4]?.timestamp).toEqual(noOdds[2].timestamp);
  });

  it('inputs null items there is a gap in the data', () => {
    const noOddDays = generateDated(5, 0, [1, 3]);
    const fiveStampedDays = generateTimestamped(5, 0);
    const { datedData, alignedData, alignedEvents } = generateUnionArrays(
      noOddDays,
      fiveStampedDays,
      generateDateRangeDays(5, 0),
    );

    expect(datedData.length).toEqual(fiveStampedDays.length);
    expect(alignedData[1]).toBeNull();
    expect(alignedEvents[1]?.timestamp).toEqual(fiveStampedDays[1].timestamp);
    expect(alignedData[3]).toBeNull();
    expect(alignedEvents[3]?.timestamp).toEqual(fiveStampedDays[3].timestamp);

    expect(datedData[0].dateInMillis).toEqual(noOddDays[0].dateInMillis);
    expect(datedData[2].dateInMillis).toEqual(noOddDays[1].dateInMillis);
    expect(datedData[4].dateInMillis).toEqual(noOddDays[2].dateInMillis);

    expect(datedData[1].dateInMillis).toEqual(noOddDays[0].dateInMillis + ONE_DAY_IN_MILLIS);
    expect(datedData[3].dateInMillis).toEqual(noOddDays[1].dateInMillis + ONE_DAY_IN_MILLIS);

    expect(alignedData[0]?.dateInMillis).toEqual(noOddDays[0].dateInMillis);
    expect(alignedData[2]?.dateInMillis).toEqual(noOddDays[1].dateInMillis);
    expect(alignedData[4]?.dateInMillis).toEqual(noOddDays[2].dateInMillis);
  });
});

describe('Testing the util function to line up DQ events and data by timestamp', () => {
  it('matches the easy case of 1-1', () => {
    const fiveDatedDays = generateDated(5, 0);
    const fiveStampedDays = generateTimestamped(5, 0);
    const outputArray = generateEqualLengthEventArray(fiveDatedDays, fiveStampedDays);
    expect(outputArray.length).toEqual(5);
    fiveDatedDays.forEach((item, idx) => {
      expect(outputArray[idx]?.timestamp).toEqual(item.dateInMillis);
    });
  });

  it('is not troubled by small time mismatches', () => {
    const fiveDatedDays = generateDated(5, 0);
    const fiveStampedDays = generateTimestamped(5, 0, [], 1000 * 60 * 60);
    const outputArray = generateEqualLengthEventArray(fiveDatedDays, fiveStampedDays);
    expect(outputArray.length).toEqual(5);
    fiveStampedDays.forEach((item, idx) => {
      expect(outputArray[idx]?.timestamp).toEqual(item.timestamp);
    });
  });

  it('handles a simple case with no DQEs', () => {
    const threeDatedDays = generateDated(3, 0);
    const outputArray = generateEqualLengthEventArray(threeDatedDays, []);
    expect(outputArray).toEqual([null, null, null]);
  });

  it('returns empty when there is no data', () => {
    const threeStampedDays = generateTimestamped(3, 0);
    const outputArray = generateEqualLengthEventArray([], threeStampedDays);
    expect(outputArray).toEqual([]);
  });

  it('handles the case where the DQEs start earlier than the Data', () => {
    const fourDatedDays = generateDated(4, 2);
    const fiveEarlierStamps = generateTimestamped(5, 1);
    const outputArray = generateEqualLengthEventArray(fourDatedDays, fiveEarlierStamps);
    expect(outputArray.length).toEqual(4);
    fourDatedDays.forEach((day, idx) => {
      expect(outputArray[idx]?.timestamp).toEqual(day.dateInMillis);
    });
  });

  it('inputs null items when there is no matching value', () => {
    const fiveDatedDays = generateDated(5, 0);
    const noOdds = generateTimestamped(5, 0, [1, 3]);
    const outputArray = generateEqualLengthEventArray(fiveDatedDays, noOdds);
    expect(outputArray.length).toEqual(fiveDatedDays.length);
    expect(outputArray[1]).toBeNull();
    expect(outputArray[3]).toBeNull();
    expect(outputArray[0]?.timestamp).toEqual(noOdds[0].timestamp);
    expect(outputArray[2]?.timestamp).toEqual(noOdds[1].timestamp);
    expect(outputArray[4]?.timestamp).toEqual(noOdds[2].timestamp);
  });

  it('inputs consecutive null items when appropriate', () => {
    const fiveDatedDays = generateDated(5, 0);
    const noOdds = generateTimestamped(5, 0, [1, 2]);
    const outputArray = generateEqualLengthEventArray(fiveDatedDays, noOdds);
    expect(outputArray.length).toEqual(fiveDatedDays.length);
    expect(outputArray[1]).toBeNull();
    expect(outputArray[2]).toBeNull();
    expect(outputArray[0]?.timestamp).toEqual(noOdds[0].timestamp);
    expect(outputArray[3]?.timestamp).toEqual(noOdds[1].timestamp);
    expect(outputArray[4]?.timestamp).toEqual(noOdds[2].timestamp);
  });

  it('overwrites consecutive items', () => {
    const threeDatedDays = generateDated(3, 0);
    const repeated = generateTimestamped(1, 0);
    repeated.push({ timestamp: repeated[0].timestamp + 500 });
    repeated.push({ timestamp: repeated[0].timestamp + 1000 });
    repeated.push({ timestamp: repeated[0].timestamp + 1500 });
    repeated.push({ timestamp: repeated[0].timestamp + 2000 }); // this is the value that should be used.
    const outputArray = generateEqualLengthEventArray(threeDatedDays, repeated);
    expect(outputArray.length).toEqual(threeDatedDays.length);
    expect(outputArray[0]?.timestamp).toEqual(repeated[0].timestamp + 2000);
    expect(outputArray[1]).toBeNull();
    expect(outputArray[2]).toBeNull();
  });
});

// export interface MetricSeriesData {
//   label: string;
//   values: (number | null)[];
//   color: string;
//   datasetName?: string;
// }

describe('Testing the metric series data clipping function', () => {
  it('Does nothing to data that is not outside the bounds of the chart', () => {
    const normalData: MetricSeriesData[] = [
      {
        label: 'foo',
        values: [1, 2, 3],
        color: 'red',
      },
      {
        label: 'bar',
        values: [4, 5, 6],
        color: 'blue',
      },
    ];
    const timestamps = [100, 101, 102];
    const { clippedData, clippedTimestamps, validPairing } = clipNumericTimestampData(
      timestamps,
      normalData,
      [99, 103],
    );
    expect(validPairing).toBe(true);
    expect(clippedData.length).toEqual(2);
    expect(clippedData[0].values).toEqual([1, 2, 3]);
    expect(clippedData[1].values).toEqual([4, 5, 6]);
    expect(clippedTimestamps).toEqual([100, 101, 102]);
  });

  it('Clips the expected values of the start and end of the bounds', () => {
    const normalData: MetricSeriesData[] = [
      {
        label: 'foo',
        values: [1, 2, 3, 4, 5],
        color: 'red',
      },
      {
        label: 'bar',
        values: [4, 5, 6, 7, 8],
        color: 'blue',
      },
    ];
    const timestamps = [100, 101, 105, 106, 110];
    const { clippedData, clippedTimestamps, validPairing } = clipNumericTimestampData(
      timestamps,
      normalData,
      [102, 108],
    );
    expect(validPairing).toBe(true);
    expect(clippedData.length).toEqual(2);
    expect(clippedData[0].values).toEqual([3, 4]);
    expect(clippedData[1].values).toEqual([6, 7]);
    expect(clippedTimestamps).toEqual([105, 106]);
  });

  it('responds as expected with invalid data', () => {
    const badData: MetricSeriesData[] = [
      {
        label: 'foo',
        values: [1, 2, 3, 4, 5],
        color: 'red',
      },
      {
        label: 'bar',
        values: [4, 5, 6, 7],
        color: 'blue',
      },
    ];
    const timestamps = [100, 101, 105, 106, 110];
    const { clippedData, clippedTimestamps, validPairing } = clipNumericTimestampData(timestamps, badData, [102, 108]);
    expect(validPairing).toBe(false);
    expect(clippedData).toEqual([]);
    expect(clippedTimestamps).toEqual([]);
  });

  it('Rejects bad time bounds', () => {
    const normalData: MetricSeriesData[] = [
      {
        label: 'foo',
        values: [1, 2, 3, 4, 5],
        color: 'red',
      },
      {
        label: 'bar',
        values: [4, 5, 6, 7, 8],
        color: 'blue',
      },
    ];
    const timestamps = [100, 101, 105, 106, 110];
    const { clippedData, clippedTimestamps, validPairing } = clipNumericTimestampData(
      timestamps,
      normalData,
      [115, 108],
    );
    const {
      clippedData: otherData,
      clippedTimestamps: otherTimestamps,
      validPairing: otherPairing,
    } = clipNumericTimestampData(timestamps, normalData, [115, 115]);

    expect(validPairing).toBe(false);
    expect(clippedData).toEqual([]);
    expect(clippedTimestamps).toEqual([]);

    expect(otherPairing).toBe(false);
    expect(otherData).toEqual([]);
    expect(otherTimestamps).toEqual([]);
  });
});
