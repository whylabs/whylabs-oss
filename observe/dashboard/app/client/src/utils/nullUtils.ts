export const isExactlyNullOrUndefined = (arg: unknown): arg is null | undefined => {
  return arg === null || arg === undefined;
};

export const areAllDefinedAndNonNull = (...args: unknown[]): boolean => {
  return args.every((arg) => !isExactlyNullOrUndefined(arg));
};

export const isNotNullish = <T>(arg: T | undefined | null): arg is T => {
  return arg != null;
};
