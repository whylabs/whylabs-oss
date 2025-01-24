import { groupByResult, GroupedResults } from './promises';

/**
 * Take the items in an array and group them into buckets.
 * @param items The array of items.
 * @param keyFn A fn that determines which bucket items go into.
 * @param valueFn A fn to map the value before grouping it. Can just be the identity function.
 * @param seed Optional initial value.
 */
export function groupBy<T, K extends string, V>(
  items: T[],
  keyFn: (item: T) => K | undefined,
  valueFn: (item: T) => V,
  seed: Record<K, V[]> = {} as Record<K, V[]>,
): Record<K, V[]> {
  return items.reduce((acc, cur) => {
    const key = keyFn(cur);
    const val = valueFn(cur);

    if (key !== undefined) {
      acc[key] = acc[key] || [];
      acc[key].push(val);
    }

    return acc;
  }, seed);
}

/**
 * Like `groupBy` except each value is a single item, not an array.
 * @param items The array of items.
 * @param keyFn A fn that determines which bucket items go into.
 * @param valueFn A fn to map the value before grouping it. Can just be the identity function.
 * @param seed Optional initial value.
 */
export function pairBy<T, K extends string, V>(
  items: T[],
  keyFn: (item: T) => K | undefined,
  valueFn: (item: T) => V | undefined,
  seed: Record<K, V> = {} as Record<K, V>,
): Record<K, V> {
  return items.reduce((acc, cur) => {
    const key = keyFn(cur);
    const val = valueFn(cur);

    if (key !== undefined && val !== undefined) {
      acc[key] = val;
    }

    return acc;
  }, seed);
}

/**
 * A variant of map that transforms each item in the input array with `work`, organizes
 * the results via `Promise.allSettled`, and calls `onFail` on any failures.
 */
export async function mapTasks<T, R>(
  items: T[],
  work: (item: T) => Promise<R>,
  onFail: (item: T) => void,
): Promise<GroupedResults<R>> {
  const results = items.map((item) => {
    const result = work(item);
    result.catch(onFail);
    return result;
  });

  const settledWork = await Promise.allSettled(results);

  return groupByResult(settledWork);
}
