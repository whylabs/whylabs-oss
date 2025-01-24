import { SortDirection } from 'generated/graphql';
import { countValidColumns, sortRows } from '../tableTools';
import { FrequentItemsRow, HistogramRow, ProfileTrioRow } from '../tableTypes';

describe('Table tools counting tests', () => {
  it('counts the number of valid columns when ther are none', () => {
    const rows: ProfileTrioRow[] = [];
    expect(countValidColumns(rows)).toBe(0);
  });

  it('counts correctly when all columns are valid', () => {
    const rows: ProfileTrioRow[] = [
      { profileCounts: [1, 2, 3] },
      { profileCounts: [4, 5, 6] },
      { profileCounts: [7, 8, 9] },
    ];
    expect(countValidColumns(rows)).toBe(3);
  });

  it('counts correctly when one column is not valid', () => {
    const rows: ProfileTrioRow[] = [
      { profileCounts: [1, null, 3] },
      { profileCounts: [4, null, 6] },
      { profileCounts: [7, null, 9] },
    ];
    expect(countValidColumns(rows)).toBe(2);
  });

  it('counts a column when valid when some of its entries are null', () => {
    const rows: ProfileTrioRow[] = [
      { profileCounts: [1, null, 3] },
      { profileCounts: [4, null, 6] },
      { profileCounts: [7, 3, 9] },
    ];
    expect(countValidColumns(rows)).toBe(3);
  });

  it('respects the max parameter', () => {
    const rows: ProfileTrioRow[] = [
      { profileCounts: [1, 2, 3] },
      { profileCounts: [4, 5, 6] },
      { profileCounts: [7, 8, 9] },
    ];
    expect(countValidColumns(rows, 1)).toBe(1);
  });

  it('counts correctly when the first column is not valid', () => {
    const rows: ProfileTrioRow[] = [
      { profileCounts: [null, 2, 3] },
      { profileCounts: [null, 5, 6] },
      { profileCounts: [null, 8, 9] },
    ];
    expect(countValidColumns(rows)).toBe(2);
  });
});

describe('Table tools sorting tests', () => {
  const getFiIndex = (fi: FrequentItemsRow) => fi.item;
  const getHistogramIndex = (hi: HistogramRow) => hi.bin;
  it('correctly handles an empty array of rows', () => {
    const rows: FrequentItemsRow[] = [];
    const hiRows: HistogramRow[] = [];
    expect(sortRows(rows, getFiIndex, 'index', SortDirection.Asc)).toEqual([]);
    expect(sortRows(hiRows, getHistogramIndex, 'index', SortDirection.Desc)).toEqual([]);
  });

  it('returns the original rows if the target is unknown or the direction is undefined', () => {
    const hiRows: HistogramRow[] = [
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 2, 3] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [4, 5, 6] },
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [7, 8, 9] },
    ];
    expect(sortRows(hiRows, getHistogramIndex, 'unknown', SortDirection.Desc)).toEqual(hiRows);
    expect(sortRows(hiRows, getHistogramIndex, 'index', undefined)).toEqual(hiRows);
  });

  it('sorts on index when the index is a number', () => {
    const hiRows: HistogramRow[] = [
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 2, 3] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [4, 5, 6] },
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [7, 8, 9] },
    ];

    const reversed: HistogramRow[] = [
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [7, 8, 9] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [4, 5, 6] },
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 2, 3] },
    ];
    expect(sortRows(hiRows, getHistogramIndex, 'index', SortDirection.Desc)).toEqual(reversed);
  });

  it('sorts on index when the index is a string', () => {
    const fiRows: FrequentItemsRow[] = [
      { item: 'a', profileCounts: [1, 2, 3] },
      { item: 'b', profileCounts: [4, 5, 6] },
      { item: 'c', profileCounts: [7, 8, 9] },
    ];

    const reversed: FrequentItemsRow[] = [
      { item: 'c', profileCounts: [7, 8, 9] },
      { item: 'b', profileCounts: [4, 5, 6] },
      { item: 'a', profileCounts: [1, 2, 3] },
    ];
    expect(sortRows(reversed, getFiIndex, 'index', SortDirection.Asc)).toEqual(fiRows);
  });

  it('sorts on profile index', () => {
    const hiRows: HistogramRow[] = [
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 6, 7] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [2, 5, 9] },
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [3, 4, 8] },
    ];

    const firstRowSorted: HistogramRow[] = [
      // sorted descending
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [3, 4, 8] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [2, 5, 9] },
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 6, 7] },
    ];

    const secondRowSorted: HistogramRow[] = [
      // sorted descending
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 6, 7] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [2, 5, 9] },
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [3, 4, 8] },
    ];

    const thirdRowSorted: HistogramRow[] = [
      // sorted ascending
      { bin: 1, lowerEdge: 0, upperEdge: 1, profileCounts: [1, 6, 7] },
      { bin: 3, lowerEdge: 2, upperEdge: 3, profileCounts: [3, 4, 8] },
      { bin: 2, lowerEdge: 1, upperEdge: 2, profileCounts: [2, 5, 9] },
    ];
    // It does not matter what the starting set is since the data are all the same
    expect(sortRows(hiRows, getHistogramIndex, 'profile1', SortDirection.Desc)).toEqual(firstRowSorted);
    expect(sortRows(firstRowSorted, getHistogramIndex, 'profile2', SortDirection.Desc)).toEqual(secondRowSorted);
    expect(sortRows(hiRows, getHistogramIndex, 'profile3', SortDirection.Asc)).toEqual(thirdRowSorted);
  });
});
