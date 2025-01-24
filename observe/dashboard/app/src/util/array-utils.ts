type cback<T, S> = (t: T, idx: number, arr: T[]) => S;

export const mapReverse = <T, S>(array: T[], fn: cback<T, S>): S[] => {
  return array.reduceRight((result, el, idx, arr) => {
    result.push(fn(el, idx, arr));
    return result;
  }, [] as S[]);
};
/*
 * Function used to preserve key type assertion on entries when we have a type like { [key in UnionType]: foo }
 * */
export const typeSafeEntries = <Shape, UnionType extends string = string>(
  obj: { [key in UnionType]?: Shape } | ArrayLike<Shape>,
): [UnionType, Shape][] => {
  return Object.entries(obj) as [UnionType, Shape][];
};

export const arrayOfLength = (length: number): Array<number> => [...Array(length).keys()];

export const areSetsEqual = (a: Set<unknown>, b: Set<unknown>): boolean =>
  a.size === b.size && [...a].every((value) => b.has(value));
