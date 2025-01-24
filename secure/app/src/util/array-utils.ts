/*
 * Function used to preserve key type assertion on entries when we have a type like { [key in UnionType]: foo }
 * */
export const typeSafeEntries = <Shape, UnionType extends string = string>(
  obj: { [key in UnionType]?: Shape } | ArrayLike<Shape>,
): [UnionType, Shape][] => {
  return Object.entries(obj) as [UnionType, Shape][];
};
