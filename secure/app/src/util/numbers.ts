// Numbers that are "NaN" or "Infinity" by default are returned as null
export const safeParseNumber = (
  value: number | string | undefined,
  defaultValue: number | null | undefined = null,
): number | undefined | null => {
  if (typeof value === 'string') {
    return defaultValue;
  }
  return value;
};
