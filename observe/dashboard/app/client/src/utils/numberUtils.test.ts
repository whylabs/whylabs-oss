import { cloneDateUTCHours } from '~/utils/dateUtils';

import {
  areArrayEqualDelta,
  areEqualDelta,
  displayNumber,
  getMinAndMaxValueFromArray,
  getValidMaxValue,
  getValidMinValue,
  isValidNumber,
  rank,
  rankDescending,
} from './numberUtils';

describe('isValidNumber', () => {
  it.each([NaN, null, undefined])('should return false for %p', (number) => {
    expect(isValidNumber(number)).toBe(false);
  });

  it.each([0, 1, -1, 0.1, -0.1])('should return true for %p', (number) => {
    expect(isValidNumber(number)).toBe(true);
  });
});

describe('functionality tests for areEqualDelta functions', () => {
  it('sees equal things as equal', () => {
    expect(areEqualDelta(2, 2)).toBe(true);
    expect(areEqualDelta(2, 2, 0.00001)).toBe(true);
  });

  it('sees unequal things as unequal', () => {
    expect(areEqualDelta(1, 2)).toBe(false);
    expect(areEqualDelta(1, 10, 2)).toBe(false);
  });

  it('sees things that are equal within the delta to be equal', () => {
    expect(areEqualDelta(1, 1.00000001)).toBe(true);
    expect(areEqualDelta(1, 3, 4)).toBe(true);
  });

  it('returns false when given arrays of different sizes', () => {
    expect(areArrayEqualDelta([1, 1], [1, 1, 1])).toBe(false);
    expect(areArrayEqualDelta([1, 1, 1, 1], [1, 1, 1])).toBe(false);
  });

  it('gracefully handles the empty array case', () => {
    expect(areArrayEqualDelta([], [])).toBe(true);
  });

  it('sees equal arrays as equal', () => {
    expect(areArrayEqualDelta([1, 1.01, 0.99], [1, 1, 1], 0.1)).toBe(true);
    expect(areArrayEqualDelta([2, 3, 2.00000000003], [2, 3, 2])).toBe(true);
  });

  it('finds a single mismatched value and returns false', () => {
    expect(areArrayEqualDelta([1, 2, 3, 4, 5], [1, 2, 3, 5, 5])).toBe(false);
  });
});

describe('Testing array max function', () => {
  it('correctly plucks out the extrema', () => {
    expect(getMinAndMaxValueFromArray([1, 3, 2, 5, 1, 5, 5])).toEqual([1, 5]);
  });

  it('returns the max min array if the array is empty', () => {
    expect(getMinAndMaxValueFromArray([])).toEqual([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
  });

  it('finds the values if the numbers are negative', () => {
    expect(getMinAndMaxValueFromArray([-1, -3, -2])).toEqual([-3, -1]);
  });

  it('handles a case where all values are the same', () => {
    expect(getMinAndMaxValueFromArray([2, 2, 2, 2, 2, 2, 2, 2])).toEqual([2, 2]);
  });

  it('returns two copies of the value for a single item array', () => {
    expect(getMinAndMaxValueFromArray([5])).toEqual([5, 5]);
  });
});

describe('Testing the array ranking function', () => {
  it('returns the expected ranking for the simplest inputs', () => {
    expect(rank<number>([4, 3, 2, 1], (a, b) => b - a)).toEqual([1, 2, 3, 4]);
    expect(rank<number>([0], (a, b) => b - a)).toEqual([1]);
    expect(rank<number>([], (a, b) => b - a)).toEqual([]);
  });

  it('handles default cases', () => {
    expect(rankDescending([10, 1, 5, 2])).toEqual([1, 4, 2, 3]);
  });

  it('handles other types', () => {
    expect(rank<string>(['a', 'abc', 'ab'], (a, b) => a.length - b.length)).toEqual([1, 3, 2]);
  });

  it('does not alter input', () => {
    const rankable = [10, 1, 5, 2];
    rankDescending(rankable);
    expect(rankable).toEqual([10, 1, 5, 2]);
  });
});

it('cloneDateUTCHours - should set the same UTC time in a copy of the passed Date object', () => {
  const result = cloneDateUTCHours(
    new Date('2023-10-01T23:59:59.999Z').getTime(),
    new Date('2023-12-11T05:00:59.000Z'),
  );
  expect(result.toISOString()).toBe('2023-12-11T23:59:59.999Z');
});

describe('displayNumber', () => {
  it.each([NaN, null, undefined])(`should return '-' for %p`, (number) => {
    expect(displayNumber(number)).toBe('-');
  });

  it.each([
    [0, '0'],
    [0.59, '0.59'],
    [1080, '1,080'],
    [8629.75, '8,629.75'],
    [1000000, '1,000,000'],
  ])('should format %d as %s', (number, expected) => {
    expect(displayNumber(number)).toBe(expected);
  });
});

describe('testing getValidMinValue and getValidMaxValue', () => {
  it.each([
    [-1, 42, -1],
    [null, 2, 2],
    [null, undefined, null],
    [4, Number.NaN, 4],
  ])('should return the min number between %p and %p', (n1, n2, expected) => {
    expect(getValidMinValue(n1, n2)).toBe(expected);
  });

  it.each([
    [-1, 42, 42],
    [null, 2, 2],
    [null, undefined, null],
    [-6, Number.NaN, -6],
  ])('should return the max number between %p and %p', (n1, n2, expected) => {
    expect(getValidMaxValue(n1, n2)).toBe(expected);
  });
});
