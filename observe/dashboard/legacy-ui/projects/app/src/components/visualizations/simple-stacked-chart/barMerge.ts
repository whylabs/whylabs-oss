import { StackedBar } from './types';

export function createBuckets(stackedBars: StackedBar[], mergeNumber: number): StackedBar[][] {
  return stackedBars.reduce<StackedBar[][]>((buckets, item, index) => {
    const bucketIndex = Math.floor(index / mergeNumber);
    if (!buckets[bucketIndex]) {
      buckets.push([]);
    }
    buckets[bucketIndex].push(item);
    return buckets;
  }, []);
}

export function mergeBucket(bucket: StackedBar[]): StackedBar {
  const start = bucket[0].from;
  const end = bucket[bucket.length - 1].to;
  // Lint ingore note: this is a reducer, so we need to mutate the accumulator
  /* eslint-disable no-param-reassign */
  return bucket.reduce<StackedBar>(
    (merged, item) => {
      Object.keys(item.counts).forEach((key) => {
        merged.counts[key] = {
          count: (merged.counts[key]?.count ?? 0) + item.counts[key].count,
          color: item.counts[key].color,
        };
      });
      return merged;
    },
    { from: start, to: end, counts: {} } as StackedBar,
  );
}

export function mergeBars(stackedBars: StackedBar[], mergeNumber: number): StackedBar[] {
  if (mergeNumber <= 1) return stackedBars;
  const buckets = createBuckets(stackedBars, mergeNumber);
  return buckets.flatMap(mergeBucket);
}
