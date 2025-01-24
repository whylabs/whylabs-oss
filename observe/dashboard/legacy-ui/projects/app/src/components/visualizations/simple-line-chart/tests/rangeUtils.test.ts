import { DEFAULT_Y_MAX, DEFAULT_Y_MIN, generateYRange } from '../rangeUtils';

describe('Range generation tests', () => {
  it('returns default for invalid ranges', () => {
    const shouldBeDefault = generateYRange({ graphTop: 100, graphBottom: 0, valueRange: [100, -100] });
    expect(shouldBeDefault.domain()).toEqual([DEFAULT_Y_MIN, DEFAULT_Y_MAX]);
  });

  it('handles negative values as expected', () => {
    const output = generateYRange({ graphTop: 100, graphBottom: 0, valueRange: [-200, -100], yBufferRatio: 0.1 });
    expect(output.domain()).toEqual([-230, -90]);
  });

  it('ensures a minimal distance between the max and min', () => {
    const output = generateYRange({ graphTop: 100, graphBottom: 0, valueRange: [0, 1], minRange: 10 });
    // Note: the calculation would yield -4.5 and 5.5, but we round to -5 and 6 because we apply the .nice() function.
    expect(output.domain()).toEqual([-5, 6]);
  });

  it('centers around zero for an all-zero set of values', () => {
    const output = generateYRange({ graphTop: 100, graphBottom: 0, valueRange: [0, 0], minRange: 2 });
    expect(output.domain()).toEqual([-1, 1]);
  });
});
