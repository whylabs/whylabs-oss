import { isNumber } from './typeGuards';

export function areEqualDelta(a: number, b: number, delta = 0.001): boolean {
  return Math.abs(a - b) < delta;
}

export function areArrayEqualDelta(a: number[], b: number[], delta = 0.001): boolean {
  return a.length === b.length && a.every((aValue, index) => areEqualDelta(aValue, b[index], delta));
}

export function isValidNumber(a: unknown): a is number {
  return isNumber(a) && !Number.isNaN(Number(a)) && Math.abs(a) !== Infinity;
}

/**
 * Find the maximum and minimum values in a non-sorted array.
 * Returns [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER] if the array is empty.
 *
 * @param input an array of numbers
 * @returns [ min, max ]
 */
export function getMinAndMaxValueFromArray(input: number[]): [number, number] {
  let max = Number.MIN_SAFE_INTEGER;
  let min = Number.MAX_SAFE_INTEGER;
  input.forEach((n) => {
    if (!isValidNumber(n)) return;
    max = Math.max(n, max);
    min = Math.min(n, min);
  });
  return [min, max];
}

export function times(n: number, f: () => void): void {
  let i = n;
  while (i > 0) {
    i -= 1;
    f();
  }
}

export function rank<T>(arr: T[], f: (a: T, b: T) => number): number[] {
  const sorted = arr.slice().sort(f);
  return arr.map((x) => sorted.findIndex((s) => f(x, s) === 0) + 1);
}

export function rankDescending(arr: number[]): number[] {
  return rank<number>(arr, (a, b) => b - a);
}

export const displayNumber = (num: number | null | undefined): string => {
  if (!isValidNumber(num)) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const getValidMinValue = (...args: (number | null | undefined)[]): number | null => {
  const onlyNumbers = args.filter(isValidNumber);
  if (!onlyNumbers?.length) return null;
  return Math.min(...onlyNumbers);
};

export const getValidMaxValue = (...args: (number | null | undefined)[]): number | null => {
  const onlyNumbers = args.filter(isValidNumber);
  if (!onlyNumbers?.length) return null;
  return Math.max(...onlyNumbers);
};

/*
 * Set the max number of floating digits without add extra zeros
 * */
export const numberToPrecision = (n: number, precision: number): number => Number(n.toFixed(precision));
