import { JSONValue } from 'types/genericTypes';
import deepCopy from 'lodash/cloneDeep';
import { translateJsonObject } from 'utils/JsonUtils';
import { SortDirection } from 'generated/graphql';
import { AllAccessors, SortDirectionType } from '../types';

export default function sortByType<T extends Exclude<JSONValue, undefined>>(
  data: T[],
  sortDir: SortDirectionType,
  accessor?: AllAccessors<T>,
): T[] {
  if (!sortDir) return data;
  return deepCopy(data).sort((a, b) => {
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
  if (typeof a === 'number' || typeof b === 'number') return sortByNumberFn;
  if (typeof a === 'string' || typeof b === 'string') return sortByStringFn;
  if (typeof a === 'boolean' || typeof b === 'boolean') return sortByBooleanFn;
  return undefined;
};

export const sortByNumberFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (typeof a === 'number' && typeof b === 'number') {
    return isAsc ? a - b : b - a;
  }
  return defaultPartialDataSorting<T>(a, b, 'number', isAsc);
};

export const sortByStringFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (typeof a === 'string' && typeof b === 'string') {
    return isAsc ? a.localeCompare(b) : b.localeCompare(a);
  }
  return defaultPartialDataSorting<T>(a, b, 'string', isAsc);
};

export const sortByBooleanFn = <T>(a: T, b: T, sortDir: SortDirectionType): number => {
  const isAsc = sortDir === SortDirection.Asc;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
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
