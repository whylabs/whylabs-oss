export function isNotUndefined<T>(o: T | undefined): o is T {
  return o !== undefined;
}

export function isNotNull<T>(o: T | null): o is T {
  return o !== null;
}
