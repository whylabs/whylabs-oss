import { bisectAndReturnNearest } from 'utils/bisectAndReturnNearest';

describe('Testing the bisection finding function', () => {
  it('returns null for an empty array', () => {
    expect(bisectAndReturnNearest(5, [])).toBeNull();
  });

  it('returns the only existing value for the base case', () => {
    expect(bisectAndReturnNearest(-55, [120])).toEqual(120);
  });

  it('returns the closer of the two values for a two-item array', () => {
    expect(bisectAndReturnNearest(-10, [2, 3])).toEqual(2);
    expect(bisectAndReturnNearest(5, [3, 100])).toEqual(3);
    expect(bisectAndReturnNearest(100, [-4, -1])).toEqual(-1);
  });

  it('handles cases with three items well', () => {
    expect(bisectAndReturnNearest(1, [4, 10, 100])).toEqual(4);
    expect(bisectAndReturnNearest(8, [2, 18, 33])).toEqual(2);
    expect(bisectAndReturnNearest(5, [0, 4, 10])).toEqual(4);
    expect(bisectAndReturnNearest(5, [0, 3, 5])).toEqual(5);
    expect(bisectAndReturnNearest(5, [0, 2, 3])).toEqual(3);
  });

  it('handles big cases as would be expected', () => {
    expect(bisectAndReturnNearest(10, [2, 4, 6, 9, 12, 16, 18, 20])).toEqual(9);
    expect(bisectAndReturnNearest(19, [2, 4, 6, 9, 12, 16, 18, 20])).toEqual(20);
    expect(bisectAndReturnNearest(33, [2, 4, 6, 9, 12, 16, 18, 20])).toEqual(20);
  });
});
