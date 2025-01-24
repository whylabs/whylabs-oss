import { JSONValue, translateJsonObject } from '~/types/genericTypes';
import { AllAccessors, SortDirection, SortDirectionType } from '~/types/sortTypes';
import { isBoolean, isNumber, isString } from '~/utils/typeGuards';

export default function sortByType<T extends Exclude<JSONValue, undefined>>(
  data: readonly T[],
  sortDir: SortDirectionType,
  accessor?: AllAccessors<T>,
): T[] {
  if (!sortDir) return [...data];
  return [...data].sort((a, b) => {
    if (!accessor?.length) {
      const sortFnByType = getSortFnByType<JSONValue>(a, b);
      return sortFnByType?.(a, b, sortDir) ?? 0;
    }
    let valueA: JSONValue = a;
    let valueB: JSONValue = b;
    accessor.forEach((key) => {
      const tempA = translateJsonObject(valueA);
      const tempB = translateJsonObject(valueB);
      valueA = tempA?.[key] ?? {};
      valueB = tempB?.[key] ?? {};
    });
    const sortFnByType = getSortFnByType(valueA, valueB);
    return sortFnByType?.(valueA, valueB, sortDir) ?? 0;
  });
}

export const getSortFnByType = <T>(a: T, b: T): (<R>(a: R, b: R, sortDir: SortDirectionType) => number) | undefined => {
  if (isNumber(a) || isNumber(b)) return sortByNumberFn;
  if (isString(a) || isString(b)) return sortByStringFn;
  if (isBoolean(a) || isBoolean(b)) return sortByBooleanFn;
  return undefined;
};

export const sortByNumberFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (isNumber(a) && isNumber(b)) {
    return isAsc ? a - b : b - a;
  }
  return defaultPartialDataSorting<T>(a, b, 'number', isAsc);
};

export const sortByStringFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (isString(a) && isString(b)) {
    return isAsc ? a.localeCompare(b) : b.localeCompare(a);
  }
  return defaultPartialDataSorting<T>(a, b, 'string', isAsc);
};

export const sortByBooleanFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (isBoolean(a) && isBoolean(b)) {
    return isAsc ? Number(a) - Number(b) : Number(b) - Number(a);
  }
  return defaultPartialDataSorting<T>(a, b, 'boolean', isAsc);
};

export const defaultPartialDataSorting = <T>(a: T, b: T, type: string, isAsc: boolean): number => {
  if (typeof a === type) {
    return isAsc ? 1 : -1;
  }
  if (typeof b === type) {
    return isAsc ? -1 : 1;
  }
  return 0;
};
