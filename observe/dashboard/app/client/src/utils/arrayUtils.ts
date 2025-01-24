type cback<T, S> = (t: T, idx: number, arr: T[]) => S;

export function mapReverse<T, S>(array: T[], fn: cback<T, S>): S[] {
  return array.reduceRight((result, el, idx, arr) => {
    result.push(fn(el, idx, arr));
    return result;
  }, [] as S[]);
}
/*
 * Function used to preserve key type assertion on entries when we have a type like { [key in UnionType]: foo }
 * */
export function typeSafeEntries<Shape, UnionType extends string = string>(
  obj: { [key in UnionType]?: Shape } | ArrayLike<Shape>,
): [UnionType, Shape][] {
  return Object.entries(obj) as [UnionType, Shape][];
}

export const arrayOfLength = (length: number): Array<number> => [...Array(length).keys()];

/*
 * This can be better than lodash isEquals, because we make usage of Sets ability to find by index
 * rather than convert both to array
 */
export const areSetsEqual = (a: Set<unknown>, b: Set<unknown>): boolean =>
  a.size === b.size && [...a].every((value) => b.has(value));
