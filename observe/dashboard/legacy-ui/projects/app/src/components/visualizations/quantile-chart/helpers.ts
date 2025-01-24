import { DatedData } from 'types/graphTypes';
import { DistanceEvent } from 'hooks/useFeatureDistance';
import { DriftConfig } from 'generated/monitor-schema';

export function nearEqual(a: number, b: number, delta: number): boolean {
  return Math.abs(a - b) < delta;
}

export interface DistanceTimestamp {
  dateInMillis: number;
  distanceValue: number | null;
  threshold: number | null;
}
export const mapAlgorithmsName = new Map<DriftConfig['algorithm'], string>([
  ['hellinger', 'Hellinger distance'],
  ['kl_divergence', 'KL divergence'],
  ['jensenshannon', 'JS divergence'],
  ['psi', 'PSI'],
]);
export function matchDatesAndArrangeSpacesForSortedData(
  data: DatedData[],
  distance: DistanceEvent[],
  delta: number,
): DistanceTimestamp[] {
  let dataIdx = 0;
  let distanceIdx = 0;

  const spacedItems: DistanceTimestamp[] = [];
  while (dataIdx < data.length && distanceIdx < distance.length) {
    if (nearEqual(data[dataIdx].dateInMillis, distance[distanceIdx].dateInMillis, delta)) {
      spacedItems.push(distance[distanceIdx]);
      dataIdx += 1;
      distanceIdx += 1;
    } else if (data[dataIdx].dateInMillis > distance[distanceIdx].dateInMillis) {
      // in this case, we just want to bump the distance array index forward one.
      distanceIdx += 1;
    } else {
      // In this case, the DQE array has scooted ahead of the data array, so push a null and bump the data index
      spacedItems.push({ dateInMillis: data[dataIdx].dateInMillis, distanceValue: null, threshold: null });
      dataIdx += 1;
    }
  }

  if (spacedItems.length < data.length) {
    for (let i = spacedItems.length; i < data.length; i += 1) {
      spacedItems.push({ dateInMillis: data[i].dateInMillis, distanceValue: null, threshold: null });
    }
  }
  return spacedItems;
}
