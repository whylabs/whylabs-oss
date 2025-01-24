import { DEFAULT_Y_MAX, DEFAULT_Y_MIN } from 'components/visualizations/simple-line-chart/rangeUtils';
import {
  areArrayEqualDelta,
  areEqualDelta,
  friendlyFormat,
  getMinAndMaxValueFromArray,
  isValidNumber,
  rank,
  rankDescending,
} from '../numberUtils';

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
    expect(getMinAndMaxValueFromArray([])).toEqual([DEFAULT_Y_MIN, DEFAULT_Y_MAX]);
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

  it('handles null and undefined input as if it was not there', () => {
    expect(getMinAndMaxValueFromArray([1, 2, 3, null, undefined, 4, 5])).toEqual([1, 5]);
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

describe('Testing the number formatting function', () => {
  const testValues = [
    { num: 1234, digits: 1, output: '1.2k' },
    { num: 100000000, digits: 1, output: '100M' },
    { num: 299792458, digits: 1, output: '299.8M' },
    { num: 759878, digits: 1, output: '759.9k' },
    { num: 759878, digits: 0, output: '760k' },
    { num: 123, digits: 1, output: '123' },
    { num: 123.456, digits: 1, output: '123.5' },
    { num: 123.456, digits: 2, output: '123.46' },
    { num: 123.456, digits: 4, output: '123.456' },
  ];
  const smallTestValues = [
    { num: 0, digits: 5, output: '0' },
    { num: 0.1234, digits: 1, output: '0.1' },
    { num: 0.0001234, digits: 2, output: '0.00012' },
    { num: -0.0001234, digits: 2, output: '-0.00012' },
    { num: 0.000001234, digits: 2, output: '1.23e-6' },
    { num: -0.000001234, digits: 3, output: '-1.234e-6' },
    { num: 0.0000000016, digits: 0, output: '2e-9' },
  ];
  const mediumTestValues = [
    { num: 1234, digits: 1, output: '1,234' },
    { num: 100000000, digits: 1, output: '100M' },
    { num: 299792458, digits: 1, output: '299.8M' },
    { num: 759878, digits: 1, output: '759.9k' },
    { num: 759878, digits: 0, output: '760k' },
    { num: 123, digits: 1, output: '123' },
  ];
  it('outputs expected values for large numbers in classical format', () => {
    testValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits, { bypassThousands: true })).toEqual(tv.output);
    });
  });
  it('outputs expected values with pretty-print thousands', () => {
    mediumTestValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits)).toEqual(tv.output);
    });
  });
  it('outputs expected values for small numbers', () => {
    smallTestValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits)).toEqual(tv.output);
    });
  });
  it('can bypass the small number formatting rules', () => {
    expect(friendlyFormat(0.0000012, 2, { bypassSmall: true })).toEqual('0');
  });
  it('returns an empty string for invalid digit requests and NaN', () => {
    expect(friendlyFormat(Number.NaN, 3)).toEqual('');
    expect(friendlyFormat(1234567, -5)).toEqual('');
  });
});

describe('isValidNumber', () => {
  it.each([0, 1, 1.0, 1.1, '1', '1.2'])('returns true for valid number %p', (input) => {
    expect(isValidNumber(input)).toBe(true);
  });

  it.each([NaN, null, undefined, {}, [], '', 'a'])('returns false for invalid number %p', (input) => {
    expect(isValidNumber(input)).toBe(false);
  });
});
