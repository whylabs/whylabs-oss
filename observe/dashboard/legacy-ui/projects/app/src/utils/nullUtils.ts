export function isExactlyNullOrUndefined(arg: unknown): arg is null | undefined {
  return arg === null || arg === undefined;
}

export function areAllDefinedAndNonNull(...args: unknown[]): boolean {
  return args.every((arg) => !isExactlyNullOrUndefined(arg));
}

export function isNotNullish<T>(arg: T | undefined | null): arg is T {
  return arg != null;
}
