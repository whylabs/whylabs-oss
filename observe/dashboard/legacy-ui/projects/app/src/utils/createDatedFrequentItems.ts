import { FrequentItemsFieldsFragment } from 'generated/graphql';
import { areAllDefinedAndNonNull } from './nullUtils';

export interface DatedFrequentItem {
  dateInMillis: number;
  lastUploadTimestamp?: number;
  showAsDiscrete: boolean;
  frequentItems: {
    value: string;
    estimate: number;
  }[];
}

export function createFlexibleDatedFrequentItems(
  data: { sketches: Array<FrequentItemsFieldsFragment> } | null | undefined,
): DatedFrequentItem[] {
  if (!data) {
    return [];
  }
  return data.sketches.map((datum) => ({
    dateInMillis: datum.datasetTimestamp ?? 0,
    lastUploadTimestamp: datum.lastUploadTimestamp ?? undefined,
    showAsDiscrete: datum.showAsDiscrete,
    frequentItems: datum.frequentItems
      .filter((fi) => areAllDefinedAndNonNull(fi.value, fi.estimate))
      .map((fi) => ({
        value: fi.value as string,
        estimate: fi.estimate as number,
      })),
  }));
}

export function createSortedCumulativeFrequents(items: DatedFrequentItem[]): [string, number][] {
  const totalCount = items.reduce((acc, current) => {
    current.frequentItems.forEach((fi) => {
      if (!acc.has(fi.value)) {
        acc.set(fi.value, 0);
      }
      acc.set(fi.value, (acc.get(fi.value) as number) + fi.estimate);
    });
    return acc;
  }, new Map<string, number>());
  const arrayForm = Array.from(totalCount);
  arrayForm.sort((a, b) => b[1] - a[1]);
  return arrayForm;
}
