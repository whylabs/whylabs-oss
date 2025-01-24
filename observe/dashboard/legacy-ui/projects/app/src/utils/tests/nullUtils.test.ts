import { areAllDefinedAndNonNull, isExactlyNullOrUndefined } from 'utils/nullUtils';

describe('Testing Null Utils Functions', () => {
  it('correctly identifies null and undefined', () => {
    expect(isExactlyNullOrUndefined(null)).toBe(true);
    expect(isExactlyNullOrUndefined(undefined)).toBe(true);
  });

  it('correctly identifies things that are not null or undefined', () => {
    expect(isExactlyNullOrUndefined(0)).toBe(false);
    expect(isExactlyNullOrUndefined({ x: 5, y: 'foo' })).toBe(false);
    expect(isExactlyNullOrUndefined('')).toBe(false);
    expect(isExactlyNullOrUndefined({})).toBe(false);
    expect(isExactlyNullOrUndefined('hello world')).toBe(false);
  });

  it('correctly rejects a single null element in an array of nonnull', () => {
    expect(areAllDefinedAndNonNull(42, undefined, {})).toBe(false);
    expect(areAllDefinedAndNonNull(null)).toBe(false);
    expect(areAllDefinedAndNonNull(35, 'foo', 'bar', null)).toBe(false);
  });

  it('correctly accepts arrays full of nonnull and non-undefined things', () => {
    expect(areAllDefinedAndNonNull(true, 42, {})).toBe(true);
    expect(areAllDefinedAndNonNull('whoa')).toBe(true);
    expect(areAllDefinedAndNonNull(35, 'foo', 'bar', [], 0)).toBe(true);
  });
});
