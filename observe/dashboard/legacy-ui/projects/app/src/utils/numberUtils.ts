import { DEFAULT_Y_MAX, DEFAULT_Y_MIN } from 'components/visualizations/simple-line-chart/rangeUtils';

export function areEqualDelta(a: number, b: number, delta = 0.001): boolean {
  return Math.abs(a - b) < delta;
}

export function areArrayEqualDelta(a: number[], b: number[], delta = 0.001): boolean {
  return a.length === b.length && a.every((aValue, index) => areEqualDelta(aValue, b[index], delta));
}

export function isValidNumber(a: unknown): a is number {
  if (a === null || Array.isArray(a) || a === '') {
    // Number(null) === 0, whereas Number(undefined) === NaN
    return false;
  }
  return !Number.isNaN(Number(a));
}

/**
 * Find the maximum and minimum values in a non-sorted array.
 * Returns [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER] if the array is empty.
 *
 * @param input an array of numbers
 * @returns [ min, max ]
 */
export function getMinAndMaxValueFromArray(input: (number | null | undefined)[]): [number, number] {
  if (!input?.length) return [DEFAULT_Y_MIN, DEFAULT_Y_MAX];
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

export const SMALL_EXPONENTIAL_THRESHOLD = 0.00001;

export function smallNumberFormat(num: number, digits: number): string {
  if (num === 0) {
    return '0';
  }
  if (Math.abs(num) < SMALL_EXPONENTIAL_THRESHOLD) {
    return num.toExponential(digits);
  }
  const precise = num.toPrecision(digits < 1 || digits > 100 ? 2 : digits);
  return String(num).length < precise.length ? String(num) : precise;
}

type FriendlyFormatOptions = {
  bypassSmall?: boolean;
  bypassThousands?: boolean;
  missingValueDisplay?: string;
  region?: string;
};

const DEFAULT_REGION = 'en-US';

/**
 *
 * @param num The number to be formatted.
 * @param digits The number of digits after the decimal in the final number. Note that this
 * value is a maximum value, since trailing zeros will be omitted.
 * @param bypassSmall <code>true</code> only if you want to bypass the small number (abs < 1) formatting logic.
 * @returns A string version of the input number for display. For instance,
 * <code>friendlyFormat(1234, 1) = "1.2k"</code>
 */
export function friendlyFormat(num: number | null | undefined, digits = 3, options?: FriendlyFormatOptions): string {
  const bypassSmall = options?.bypassSmall ?? false;
  const missingValueDisplay = options?.missingValueDisplay ?? '';
  if (num === undefined || num === null || Number.isNaN(num) || digits < 0) {
    return missingValueDisplay;
  }
  const si = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  if (!bypassSmall && Math.abs(num) < 1) {
    return smallNumberFormat(num, digits);
  }

  for (i = si.length - 1; i > 0; i -= 1) {
    if (Math.abs(num) >= si[i].value) {
      break;
    }
  }
  if (i === 1 && Math.abs(num) < 100000 && !options?.bypassThousands) {
    return new Intl.NumberFormat(options?.region ?? DEFAULT_REGION, { maximumFractionDigits: digits }).format(num);
  }
  return (num / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol;
}

export function asPercentage(value: number, decimals = 2): string {
  return `${friendlyFormat(value * 100, decimals)}%`;
}
