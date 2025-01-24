import { createSortedCumulativeFrequents, DatedFrequentItem } from 'utils/createDatedFrequentItems';

describe('createSortedCumulativeFrequents tests', () => {
  it('handles empty input as expected', () => {
    expect(createSortedCumulativeFrequents([])).toEqual([]);
  });

  it('sorts a trivial set', () => {
    const input: DatedFrequentItem = {
      dateInMillis: 1,
      showAsDiscrete: true,
      frequentItems: [{ value: 'a', estimate: 2 }],
    };
    expect(createSortedCumulativeFrequents([input])).toEqual([['a', 2]]);
  });

  it('correctly combines items', () => {
    const input: DatedFrequentItem[] = [
      {
        dateInMillis: 1,
        showAsDiscrete: true,
        frequentItems: [
          { value: 'a', estimate: 2 },
          { value: 'b', estimate: 8 },
        ],
      },
      {
        dateInMillis: 2,
        showAsDiscrete: true,
        frequentItems: [
          { value: 'a', estimate: 4 },
          { value: 'b', estimate: 5 },
        ],
      },
    ];
    expect(createSortedCumulativeFrequents(input)).toEqual([
      ['b', 13],
      ['a', 6],
    ]);
  });

  it('combines unshared items', () => {
    const input: DatedFrequentItem[] = [
      {
        dateInMillis: 1,
        showAsDiscrete: true,
        frequentItems: [
          { value: 'a', estimate: 2 },
          { value: 'b', estimate: 8 },
          { value: 'c', estimate: 100 },
        ],
      },
      {
        dateInMillis: 2,
        showAsDiscrete: true,
        frequentItems: [
          { value: 'a', estimate: 4 },
          { value: 'd', estimate: 1 },
          { value: 'b', estimate: 5 },
        ],
      },
    ];
    expect(createSortedCumulativeFrequents(input)).toEqual([
      ['c', 100],
      ['b', 13],
      ['a', 6],
      ['d', 1],
    ]);
  });
});
