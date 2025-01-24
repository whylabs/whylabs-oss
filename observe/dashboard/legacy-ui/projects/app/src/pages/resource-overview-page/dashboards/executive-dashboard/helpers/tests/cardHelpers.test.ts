import { Card, DynamicColor } from 'generated/dashboard-schema';
import { DEFAULT_COLORINFO, determineColors } from '../cardHelpers';

const INCREASING_DYNAMIC: DynamicColor = {
  id: 'increasing',
  thresholdInfo: [
    { threshold: 1, colorInfo: { color: '#FFF' } },
    { threshold: 2, colorInfo: { color: '#EEE', backgroundColor: '#AAA' } },
    { threshold: 3, colorInfo: { color: '#DDD', hasBorder: true } },
  ],
};

const DECREASING_DYNAMIC: DynamicColor = {
  decreasing: true,
  id: 'decreasing',
  thresholdInfo: [
    { threshold: 3, colorInfo: { color: '#FFF' } },
    { threshold: 2, colorInfo: { color: '#EEE' } },
    { threshold: 1, colorInfo: { color: '#DDD' } },
  ],
};

const SAMPLE_ARRAY = [INCREASING_DYNAMIC, DECREASING_DYNAMIC];

const INCREASING_CARD: Card = {
  config: {
    dynamicColorId: 'increasing',
  },
  queryId: 'foo',
  title: { text: 'hello world' },
};

const DECREASING_CARD: Card = {
  config: {
    dynamicColorId: 'decreasing',
  },
  queryId: 'bar',
  title: { text: 'hello world' },
};

const EMPTY_CARD: Card = {
  queryId: 'slug',
  title: { text: 'hello world' },
};

describe('Testing the card background color utility functions', () => {
  it('uses default values when there is no dynamic range', () => {
    const output = determineColors(EMPTY_CARD, [], 10);
    expect(output).toEqual(DEFAULT_COLORINFO);
  });

  it.each([
    [0, '#FFF'],
    [1, '#EEE'],
    [1.5, '#EEE'],
    [2, '#DDD'],
    [10, '#DDD'],
  ])('finds appropiate info for an increasing threshold with %d', (val, expectedColor) => {
    const output = determineColors(INCREASING_CARD, SAMPLE_ARRAY, val);
    expect(output.color).toEqual(expectedColor);
  });

  it.each([
    [4, '#FFF'],
    [3, '#EEE'],
    [2.5, '#EEE'],
    [1.5, '#DDD'],
    [0, '#DDD'],
  ])('finds appropiate info for a decreasing threshold with %d', (val, expectedColor) => {
    const output = determineColors(DECREASING_CARD, SAMPLE_ARRAY, val);
    expect(output.color).toEqual(expectedColor);
  });

  it('picks out listed background for partial colorInfo', () => {
    const output = determineColors(INCREASING_CARD, SAMPLE_ARRAY, 1);
    expect(output.backgroundColor).toEqual('#AAA');
  });

  it('picks out listed border value for partial card info', () => {
    const output = determineColors(INCREASING_CARD, SAMPLE_ARRAY, 2);
    expect(output.hasBorder).toBe(true);
  });

  it('uses default values for partial card info', () => {
    const output = determineColors(INCREASING_CARD, SAMPLE_ARRAY, 0);
    expect(output.backgroundColor).toEqual(DEFAULT_COLORINFO.backgroundColor);
    expect(output.hasBorder).toBe(DEFAULT_COLORINFO.hasBorder);
  });
});
