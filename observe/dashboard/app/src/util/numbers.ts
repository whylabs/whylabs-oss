import { Maybe, NumberNaNInf } from '../services/data/data-service/data-service-types';

export const SMALL_EXPONENTIAL_THRESHOLD = 0.00001;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
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

type FormattingOptions = {
  bypassSmall?: boolean;
  bypassThousands?: boolean;
  region?: string;
};

const DEFAULT_REGION = 'en-US';
/**
 * @param num The number to be formatted.
 * @param digits The number of digits after the decimal in the final number. Note that this
 * value is a maximum value, since trailing zeros will be omitted.
 * @param options <code>FormattingOptions</code> allowing you to bypass small number logic, thousands logic, or set a specific region.
 * @returns A string version of the input number for display. For instance,
 * <code>friendlyFormat(123456, 1) = "123.5k"</code>
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function friendlyFormat(num: number | null | undefined, digits = 3, options?: FormattingOptions): string {
  if (num === undefined || num === null || Number.isNaN(num) || digits < 0) {
    return '';
  }
  const { bypassSmall, bypassThousands, region } = options || {};
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
  if (i === 1 && Math.abs(num) < 100000 && !bypassThousands) {
    return new Intl.NumberFormat(region ?? DEFAULT_REGION, { maximumFractionDigits: digits }).format(num);
  }
  return (num / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol;
}

/**
 * Returns the number if it is a number, null otherwise
 * @param value
 */
export const safeParseNaN = (value: Maybe<NumberNaNInf>): number | null => (typeof value === 'number' ? value : null);

/**
 * Returns the number of it is a number, otherwise defaults to the specified value
 * @param defaultValue
 * @param value
 */
export const parsePossibleNaNWithDefault = (defaultValue: number, value: Maybe<NumberNaNInf>): number => {
  const parsed = safeParseNaN(value);
  return parsed ?? defaultValue;
};

// Numbers serialized in an external service
export type StringifiedNumber = string | 'NaN' | 'Infinity' | 'Inf';

export const parseStringifiedNumber = (value: StringifiedNumber | undefined, defaultValue: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    // GraphQL doesn't support Nan or Infinity
    return defaultValue;
  }

  return parsed;
};

export const parseIfNumber = (value: StringifiedNumber | undefined): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

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
