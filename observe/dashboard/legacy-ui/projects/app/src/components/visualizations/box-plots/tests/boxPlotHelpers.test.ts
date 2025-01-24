import { Colors } from '@whylabs/observatory-lib';
import { convertTableTypeToBoxPlotData, filterToValidQuantileData } from '../boxPlotHelpers';
import { BoxPlotTableDataType } from '../types';

const MOCK_VALID_DATA: BoxPlotTableDataType[] = [
  {
    numberSummary: {
      quantiles: {
        bins: [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1],
        counts: [1, 2, 3, 4, 5, 6, 7],
      },
    },
    profileColor: 'red',
  },
  {
    numberSummary: {
      quantiles: {
        bins: [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1],
        counts: [7, 6, 5, 4, 3, 2, 1],
      },
    },
    profileColor: 'blue',
  },
];

describe('Testing boxplot helper filter function', () => {
  it('should handle empty data', () => {
    const output = filterToValidQuantileData([]);
    expect(output).toEqual([]);
  });

  it('should allow through valid data', () => {
    const output = filterToValidQuantileData([
      { numberSummary: { quantiles: { bins: [0.25, 0.5, 0.75], counts: [1, 2, 3] } }, profileColor: 'red' },
    ]);
    expect(output).toEqual([{ bins: [0.25, 0.5, 0.75], counts: [1, 2, 3], color: 'red', profileIndex: 0 }]);
  });

  it('should filter out empty number summaries', () => {
    const output = filterToValidQuantileData([{ numberSummary: null, profileColor: 'blue' }, MOCK_VALID_DATA[0]]);
    expect(output).toHaveLength(1);
  });

  it('should filter out profiles with empty bin or count arrays', () => {
    const output = filterToValidQuantileData([
      { numberSummary: { quantiles: { bins: [], counts: [1, 2, 3] } }, profileColor: 'blue' },
      { numberSummary: { quantiles: { bins: [0.25, 0.5, 0.75], counts: [] } }, profileColor: 'magenta' },
      MOCK_VALID_DATA[0],
    ]);
    expect(output).toHaveLength(1);
  });

  it('should filter out profiles with mismatched bin and count arrays', () => {
    const output = filterToValidQuantileData([
      { numberSummary: { quantiles: { bins: [0, 0.1], counts: [1, 2, 3] } }, profileColor: 'blue' },
      { numberSummary: { quantiles: { bins: [0.25, 0.5, 0.75], counts: [6] } }, profileColor: 'magenta' },
      MOCK_VALID_DATA[0],
    ]);
    expect(output).toHaveLength(1);
  });
});

describe('Testing boxplot helper data transformation function', () => {
  it('should handle empty data', () => {
    const output = convertTableTypeToBoxPlotData([]);
    expect(output).toEqual([]);
  });

  it('should convert valid data', () => {
    const output = convertTableTypeToBoxPlotData(MOCK_VALID_DATA);
    expect(output).toEqual([
      {
        category: 'Profile 1',
        min: 1,
        firstQuartile: 3,
        median: 4,
        thirdQuartile: 5,
        max: 7,
        fill: Colors.transparent,
        stroke: 'red',
      },
      {
        category: 'Profile 2',
        min: 7,
        firstQuartile: 5,
        median: 4,
        thirdQuartile: 3,
        max: 1,
        fill: Colors.transparent,
        stroke: 'blue',
      },
    ]);
  });

  it('should filter out data that lacks enough bins or the correct ones', () => {
    const output = convertTableTypeToBoxPlotData([
      {
        numberSummary: {
          quantiles: {
            bins: [0, 0.1, 0.25], // this passes the filter because they are of equal length, but the quartiles are missing
            counts: [1, 2, 3],
          },
        },
        profileColor: 'red',
      },
    ]);
    expect(output).toEqual([]);
  });
});
