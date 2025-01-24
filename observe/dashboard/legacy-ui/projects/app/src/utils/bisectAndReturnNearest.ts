/**
 * Utility function for finding the nearest value in the array to the query value.
 * Note that this returns the value from the array, not the index of that value in the array.
 * Moreover, this function will fail if the array is not sorted, since it uses bisection to search.
 *
 * @param q a value to search for within the array
 * @param selection the array to search
 */
import { MetricResultPointFragment } from '../generated/graphql';

export function bisectAndReturnNearest(q: number, selection: number[]): number | null {
  if (selection.length === 0) {
    return null;
  }
  if (selection.length === 1) {
    return selection[0];
  }
  if (selection.length === 2) {
    return Math.abs(q - selection[0]) < Math.abs(q - selection[1]) ? selection[0] : selection[1];
  }

  const middleIndex = Math.floor(selection.length / 2);
  const middleValue = selection[middleIndex];
  if (q > middleValue) {
    return bisectAndReturnNearest(q, selection.slice(middleIndex));
  }
  return bisectAndReturnNearest(q, selection.slice(0, middleIndex + 1));
}

export const getNearestDatum = (
  t: number,
  sortedData: MetricResultPointFragment[],
  low = 0,
  high: number = sortedData.length - 1,
): number => {
  // Binary search, slightly modified to narrow into the closest index to an approximate timestamp
  if (sortedData.length === 0) {
    return -1;
  }

  if (high === low) {
    return high;
  }

  if (high - low === 1) {
    // Find which point is closest
    if (Math.abs(sortedData[low].timestamp - t) < Math.abs(sortedData[high].timestamp) - t) {
      return low;
    }
    return high;
  }

  const mid = Math.floor((low + high) / 2);
  const dataT = sortedData[mid].timestamp;

  if (t < dataT) {
    return getNearestDatum(t, sortedData, low, mid);
  }
  if (t === dataT) {
    return mid;
  }
  return getNearestDatum(t, sortedData, mid, high);
};
