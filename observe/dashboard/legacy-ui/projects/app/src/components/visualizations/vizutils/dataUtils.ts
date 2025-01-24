import { getBatchStep } from 'utils/timeUtils';
import { DatedFrequentItem } from 'utils/createDatedFrequentItems';
import { DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { DatasetTimestampedData, DatedData, TimestampedData } from 'types/graphTypes';
import { times } from 'lodash';
import { TimePeriod } from 'generated/graphql';
import {
  FORTY_FIVE_MINUTES_IN_MILLISECONDS,
  SIX_DAYS_IN_MILLISECONDS,
  TWENTY_SEVEN_DAYS_IN_MILLISECONDS,
  TWENTY_THREE_HOURS_IN_MILLISECONDS,
} from 'ui/constants';
import { addMonths, startOfMonth } from 'date-fns';
import { PairedTimestamp } from '../utils';

export function hasValidQuantileData(data: DatedKeyedQuantileSummary[]): boolean {
  return data.some((datum) => datum.quantiles.bins.length > 2 && datum.quantiles.counts.length > 1);
}

export function hasValidTopFeaturesData(data: DatedFrequentItem[]): boolean {
  return data.some((datum) => datum.frequentItems.length > 0);
}

export function withinFuzzyDistance(
  firstMillis: number,
  secondMillis: number,
  batchFrequency: TimePeriod = TimePeriod.P1D,
): boolean {
  const fuzzyDistance = getFuzzyDistance(batchFrequency);
  return Math.abs(firstMillis - secondMillis) < fuzzyDistance;
}

export interface UnionArray<U extends DatedData, T extends TimestampedData | DatedData | DatasetTimestampedData> {
  alignedData: (U | null)[];
  alignedEvents: (T | null)[];
  datedData: DatedData[];
}

function getMillis(timedItem: DatedData | TimestampedData | DatasetTimestampedData): number {
  if ('dateInMillis' in timedItem) {
    return timedItem.dateInMillis;
  }
  if ('datasetTimestamp' in timedItem && typeof timedItem.datasetTimestamp === 'number') {
    return timedItem.datasetTimestamp;
  }
  if ('timestamp' in timedItem) {
    return timedItem.timestamp;
  }
  return 0;
}

function updateMillis<T extends DatedData | TimestampedData | DatasetTimestampedData>(
  timedItem: T,
  timestamp: number,
): T {
  if ('dateInMillis' in timedItem) {
    return {
      ...timedItem,
      dateInMillis: timestamp,
    };
  }
  if ('datasetTimestamp' in timedItem) {
    return {
      ...timedItem,
      datasetTimestamp: timestamp,
    };
  }
  return {
    ...timedItem,
    timestamp,
  };
}

function filterDupes<T extends DatedData | TimestampedData | DatasetTimestampedData>(timedItems: T[]): T[] {
  return timedItems.filter((item, idx, arr) => {
    return idx === 0 || getMillis(item) > getMillis(arr[idx - 1]);
  });
}

function filterByRange<T extends DatedData | TimestampedData | DatasetTimestampedData>(
  timedItems: T[],
  [start, end]: [number, number],
): T[] {
  return timedItems.filter((item) => getMillis(item) >= start && getMillis(item) <= end);
}

interface ValueSeries {
  values: (number | null)[];
}

export function clipNumericTimestampData<T extends ValueSeries>(
  timestamps: number[],
  data: T[],
  bounds: [number, number],
): {
  clippedTimestamps: number[];
  clippedData: T[];
  validPairing: boolean;
} {
  const timeCount = timestamps.length;
  if (bounds[1] <= bounds[0] || data.some((series) => series.values.length !== timeCount)) {
    return {
      clippedData: [],
      clippedTimestamps: [],
      validPairing: false,
    };
  }
  // Note: adding one at the end of the calculation because array.slice(start, end) includes the early index.
  // Hence, finding no "out of bounds" timestamps means we'll slice starting at 0, which includes everything.
  const earlyIndex =
    timestamps.reduce((prev, curr, idx) => {
      if (curr < bounds[0]) {
        return idx;
      }
      return prev;
    }, -1) + 1;

  const lateIndex = timestamps.findIndex((t) => t > bounds[1]);
  const usedLateIndex = lateIndex < 0 ? timestamps.length : lateIndex;
  const clippedTimestamps = timestamps.slice(earlyIndex, usedLateIndex);
  const clippedData = data.map((series) => {
    return {
      ...series,
      values: series.values.slice(earlyIndex, usedLateIndex),
    };
  });
  return {
    clippedTimestamps,
    clippedData,
    validPairing: true,
  };
}

export function clipSeriesData<T extends ValueSeries>(
  timestamps: PairedTimestamp[],
  data: T[],
  bounds: [number, number],
): {
  clippedTimestamps: PairedTimestamp[];
  clippedData: T[];
  validPairing: boolean;
} {
  const timeCount = timestamps.length;
  if (bounds[1] <= bounds[0] || data.some((series) => series.values.length !== timeCount)) {
    return {
      clippedData: [],
      clippedTimestamps: [],
      validPairing: false,
    };
  }
  // Note: adding one at the end of the calculation because array.slice(start, end) includes the early index.
  // Hence, finding no "out of bounds" timestamps means we'll slice starting at 0, which includes everything.
  const earlyIndex =
    timestamps.reduce((prev, curr, idx) => {
      if (curr.timestamp < bounds[0]) {
        return idx;
      }
      return prev;
    }, -1) + 1;

  const lateIndex = timestamps.findIndex((t) => t.timestamp > bounds[1]);
  const usedLateIndex = lateIndex < 0 ? timestamps.length : lateIndex;
  const clippedTimestamps = timestamps.slice(earlyIndex, usedLateIndex);
  const clippedData = data.map((series) => {
    return {
      ...series,
      values: series.values.slice(earlyIndex, usedLateIndex),
    };
  });
  return {
    clippedTimestamps,
    clippedData,
    validPairing: true,
  };
}
export function getFuzzyDistance(batchFrequency: TimePeriod): number {
  switch (batchFrequency) {
    case TimePeriod.P1D:
      return TWENTY_THREE_HOURS_IN_MILLISECONDS;
    case TimePeriod.Pt1H:
      return FORTY_FIVE_MINUTES_IN_MILLISECONDS;
    case TimePeriod.P1W:
      return SIX_DAYS_IN_MILLISECONDS;
    case TimePeriod.P1M:
      return TWENTY_SEVEN_DAYS_IN_MILLISECONDS;
    default:
      return TWENTY_THREE_HOURS_IN_MILLISECONDS;
  }
}

export function generateRegularDates([start, end]: [number, number], batchStep: number): number[] {
  const basicDates = [];

  let currentBasicDate = start;
  while (currentBasicDate < end) {
    basicDates.push(currentBasicDate);
    currentBasicDate += batchStep;
  }
  return basicDates;
}

export function fuzzyZipDates(first: number[], second: number[], fuzzyDistance: number): number[] {
  let firstIndex = 0;
  let secondIndex = 0;
  if (first.length === 0) {
    return second;
  }
  if (second.length === 0) {
    return first;
  }

  const fuzzyZippedArray: number[] = [];
  let firstItem = 0;
  let secondItem = 0;
  while (firstIndex < first.length && secondIndex < second.length) {
    firstItem = first[firstIndex];
    secondItem = second[secondIndex];
    if (Math.abs(firstItem - secondItem) < fuzzyDistance) {
      // Pusing "both", with the assumption that they should represent the same item
      fuzzyZippedArray.push(Math.min(firstItem, secondItem));
      firstIndex += 1;
      secondIndex += 1;
    } else if (firstItem < secondItem) {
      fuzzyZippedArray.push(firstItem);
      firstIndex += 1;
    } else {
      fuzzyZippedArray.push(secondItem);
      secondIndex += 1;
    }
  }

  return fuzzyZippedArray;
}

export function generateMonthlyDates<
  U extends DatedData,
  T extends DatedData | TimestampedData | DatasetTimestampedData,
>(filteredData: U[], filteredDqEvents: T[], [start, end]: [number, number], setStartUTC = true): number[] {
  if (filteredData.length === 0) {
    return [];
  }
  let realStart = startOfMonth(start).getTime();
  if (setStartUTC) {
    realStart = new Date(realStart).setUTCHours(0, 0, 0);
  }
  const realEnd = startOfMonth(end).setUTCHours(0, 0, 0);
  const basicDates = [realStart];
  const inputNumbers = filteredData.map((fd) => fd.dateInMillis);
  const inputEventNumbers = filteredDqEvents.map(getMillis);
  const fuzzyZippedInputs = fuzzyZipDates(inputNumbers, inputEventNumbers, TWENTY_SEVEN_DAYS_IN_MILLISECONDS);

  let currentIdx = 0;
  let currentDataIdx = realStart === fuzzyZippedInputs[0] ? 1 : 0;
  const monthFudgeFactor = TWENTY_SEVEN_DAYS_IN_MILLISECONDS / 4;
  while (currentDataIdx < fuzzyZippedInputs.length) {
    const interveningMonth = addMonths(basicDates[currentIdx], 1);
    if (interveningMonth.getTime() + monthFudgeFactor < fuzzyZippedInputs[currentDataIdx]) {
      basicDates.push(interveningMonth.getTime());
      currentIdx += 1;
    } else {
      basicDates.push(fuzzyZippedInputs[currentDataIdx]);
      currentDataIdx += 1;
      currentIdx += 1;
    }
  }
  if (basicDates[basicDates.length - 1] < realEnd) {
    basicDates.push(realEnd);
  }

  return basicDates;
}

export function findFirstOccupiedIndex<T extends DatedData | TimestampedData | DatasetTimestampedData>(
  datum: T,
  dates: number[],
  distance: number,
): number {
  if (dates.length === 0 || distance <= 0) {
    return -1;
  }
  return dates.findIndex((bd) => Math.abs(bd - getMillis(datum)) < distance);
}

export function sortIfNecessary<T extends DatedData | TimestampedData | DatasetTimestampedData>(data: T[]): T[] {
  if (data.length <= 1) {
    return data;
  }
  const zerothStamp = getMillis(data[0]);
  const firstStamp = getMillis(data[1]);
  if (zerothStamp > firstStamp) {
    data.sort((a, b) => getMillis(a) - getMillis(b));
  }
  return data;
}

export function generateUnionArrays<
  U extends DatedData,
  T extends DatedData | TimestampedData | DatasetTimestampedData,
>(
  data: U[],
  dqEvents: T[],
  [start, end]: [number, number],
  batchFrequency: TimePeriod = TimePeriod.P1D,
): UnionArray<U, T> {
  const filteredData = sortIfNecessary(filterByRange(filterDupes(data), [start, end]));
  const filteredDqEvents = sortIfNecessary(filterByRange(filterDupes(dqEvents), [start, end]));
  const batchStep = getBatchStep(batchFrequency);
  const basicDates =
    batchFrequency === TimePeriod.P1M
      ? generateMonthlyDates(data, dqEvents, [start, end])
      : generateRegularDates([start, end], batchStep);

  const fuzzyDistance = getFuzzyDistance(batchFrequency);
  const alignedData: (U | null)[] = [];
  const alignedEvents: (T | null)[] = [];
  const datedData: DatedData[] = [];

  // 1. Use DatedData as the dates array, not the new basic dates
  // 2. Align the timestamps with the first actual data instance
  // 3. Find the first index of both the events and the data
  // 4. Filter for both data and events that fall outside the datedData range.
  if (filteredData.length === 0) {
    return {
      alignedData,
      alignedEvents,
      datedData,
    };
  }
  let firstDataIndex = findFirstOccupiedIndex(filteredData[0], basicDates, fuzzyDistance);
  if (firstDataIndex < 0) {
    // Error state: Date range does not include any data points.
    return {
      alignedData,
      alignedEvents,
      datedData,
    };
  }

  // Ensure that all timestamps are aligned with data.
  const offset = filteredData[0].dateInMillis - basicDates[firstDataIndex];
  datedData.push(...basicDates.map((bd) => ({ dateInMillis: bd + offset })));

  let firstEventIndex =
    filteredDqEvents.length > 0
      ? findFirstOccupiedIndex(
          filteredDqEvents[0],
          datedData.map((d) => d.dateInMillis),
          fuzzyDistance,
        )
      : -1;

  // Push blanks into both data and events until we get to the first item.
  // The length check on alignedData prevents a negative index for data or for events from
  // doing more than just filling the array with null, which is what we want.
  // We use !== 0 specifically to allow it to fill all the way with null items, which it wouldn't do
  // if we just used > 0.
  let dataFullIdx = 0;
  let eventFullIdx = 0;
  while (firstDataIndex !== 0 && alignedData.length < datedData.length) {
    alignedData.push(null);
    firstDataIndex -= 1;
    dataFullIdx += 1;
  }
  while (firstEventIndex !== 0 && alignedEvents.length < datedData.length) {
    alignedEvents.push(null);
    firstEventIndex -= 1;
    eventFullIdx += 1;
  }

  let dataIdx = 0;
  let eventIdx = 0;

  while (dataIdx < filteredData.length && alignedData.length < datedData.length && dataFullIdx < datedData.length) {
    if (withinFuzzyDistance(filteredData[dataIdx].dateInMillis, datedData[dataFullIdx].dateInMillis, batchFrequency)) {
      alignedData.push(filteredData[dataIdx]);
      dataIdx += 1;
    } else {
      alignedData.push(null);
    }
    dataFullIdx += 1;
  }
  while (dataFullIdx < datedData.length) {
    alignedData.push(null);
    dataFullIdx += 1;
  }

  while (
    eventIdx < filteredDqEvents.length &&
    alignedEvents.length < datedData.length &&
    eventFullIdx < datedData.length
  ) {
    if (
      withinFuzzyDistance(getMillis(filteredDqEvents[eventIdx]), datedData[eventFullIdx].dateInMillis, batchFrequency)
    ) {
      alignedEvents.push(updateMillis(filteredDqEvents[eventIdx], datedData[eventFullIdx].dateInMillis));
      eventIdx += 1;
    } else {
      alignedEvents.push(null);
    }
    eventFullIdx += 1;
  }

  while (eventFullIdx < datedData.length) {
    alignedEvents.push(null);
    eventFullIdx += 1;
  }

  return {
    alignedData,
    alignedEvents,
    datedData,
  };
}

export function generateEqualLengthEventArray<T extends TimestampedData>(
  data: DatedData[],
  dqEvents: T[],
): (T | null)[] {
  const linedUpEvents: (T | null)[] = [];
  if (data.length === 0) {
    return linedUpEvents;
  }
  // This alignment fails if there are no DQEs
  if (dqEvents.length === 0) {
    times(data.length, () => linedUpEvents.push(null));
    return linedUpEvents;
  }

  let currentDqIndex = 0;
  const startingDistance = Math.abs(dqEvents[0].timestamp - data[0].dateInMillis);
  // March our start point forward in the dq array if that one is misaligned temporally
  if (dqEvents[0].timestamp < data[0].dateInMillis && startingDistance > TWENTY_THREE_HOURS_IN_MILLISECONDS) {
    let startingDqEvent = dqEvents[0];
    while (
      currentDqIndex < dqEvents.length &&
      Math.abs(startingDqEvent.timestamp - data[0].dateInMillis) > TWENTY_THREE_HOURS_IN_MILLISECONDS &&
      startingDqEvent.timestamp < data[0].dateInMillis
    ) {
      currentDqIndex += 1;
      startingDqEvent = dqEvents[currentDqIndex];
    }
  }

  // Now do the alignment
  data.forEach((datum, index) => {
    let currentDqEvent = dqEvents[currentDqIndex];
    while (
      currentDqIndex < dqEvents.length &&
      Math.abs(currentDqEvent.timestamp - datum.dateInMillis) < TWENTY_THREE_HOURS_IN_MILLISECONDS
    ) {
      if (index >= linedUpEvents.length) {
        linedUpEvents.push(currentDqEvent);
      } else {
        // We overwrite if there are a ton of DQ events all mushed onto the five minute span of the feature sketch event.
        linedUpEvents[index] = currentDqEvent;
      }
      currentDqIndex += 1;
      currentDqEvent = dqEvents[currentDqIndex];
    }
    if (linedUpEvents.length <= index) {
      linedUpEvents.push(null);
    }
  });
  return linedUpEvents;
}

export type MonitoringPageType = 'feature' | 'segmentFeature' | 'outputFeature' | 'segmentOutputFeature';

export const getPageType = (isOutput: boolean, isSegment: boolean): MonitoringPageType => {
  if (isOutput) {
    if (isSegment) {
      return 'segmentOutputFeature';
    }
    return 'outputFeature';
  }
  return isSegment ? 'segmentFeature' : 'feature';
};
