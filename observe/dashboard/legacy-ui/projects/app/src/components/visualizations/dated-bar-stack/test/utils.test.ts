import {
  DatedStackedBar,
  findMaxTotalCount,
  getKeysAndColors,
  getTotalCount,
  translateDatedStackedTooltipData,
} from '../utils';

const mockData: DatedStackedBar[] = [
  {
    timestamp: 1651806000000,
    counts: [
      { name: 'DataQuality', count: 5, color: '#123123', id: 'dqeTest' },
      { name: 'Drift', count: 40, color: '#222222', id: 'driftTest' },
    ],
  },
  { timestamp: 1646535600000, counts: [{ name: 'DataQuality', count: 6, color: '#123123', id: 'dqeTest' }] },
  {
    timestamp: 1644116400000,
    counts: [
      { name: 'DataQuality', count: 6, color: '#123123', id: 'dqeTest' },
      { name: 'Ingestion', count: 90, color: '#111111', id: 'ingestionTest' },
      { name: 'Drift', count: 40, color: '#222222', id: 'driftTest' },
    ],
  },
  { timestamp: 1643770800000, counts: [] },
];

describe('Testing getTotalCount', () => {
  it.each([
    [45, mockData[0]],
    [6, mockData[1]],
    [136, mockData[2]],
    [0, mockData[3]],
  ])('getTotalCount -- Should have %p total count', (expectedTotal, data) => {
    const result = getTotalCount(data);
    expect(result).toEqual(expectedTotal);
  });
});

describe('Testing findMaxTotalCount', () => {
  it.each([
    [136, mockData],
    [45, mockData.slice(0, 2)],
    [0, [mockData[3]]],
  ])('findMaxTotalCount -- Should get %p as max value', (expectedMax, data) => {
    const result = findMaxTotalCount(data);
    expect(result).toEqual(expectedMax);
  });
});

describe('Testing getKeysAndColors', () => {
  it.each([
    ['with data', mockData],
    ['without data', []],
  ])('getKeysAndColors -- testing %p', (_, data) => {
    const result = getKeysAndColors(data);
    expect(result).toStrictEqual({
      keys: data.length ? ['dqeTest', 'driftTest', 'ingestionTest'] : [],
      colors: data.length ? ['#123123', '#222222', '#111111'] : [],
      names: data.length ? ['DataQuality', 'Drift', 'Ingestion'] : [],
    });
  });
});

describe('testing translateDatedStackedTooltipData', () => {
  it.each([1651806000000, 1646535600000, 1644116400000])(
    'testing without stacked data in %p timestamp',
    (timestamp) => {
      const result = translateDatedStackedTooltipData(timestamp, undefined);
      expect(result).toStrictEqual({
        items: [],
        timestamp,
      });
    },
  );

  it.each([
    [mockData[0].timestamp, mockData[0]],
    [mockData[1].timestamp, mockData[1]],
    [mockData[2].timestamp, mockData[2]],
    [mockData[3].timestamp, mockData[3]],
  ])('Should translate correct stacked data in %p timestamp', (timestamp, data) => {
    const result = translateDatedStackedTooltipData(timestamp, data);
    expect(result).toStrictEqual({
      items: data.counts
        .map(({ color, count, name: label }) => ({
          color,
          count,
          label,
        }))
        .sort((a, b) => {
          if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }
          return 0;
        }),
      timestamp: data.timestamp,
    });
  });
});
