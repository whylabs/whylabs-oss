import { createDatedUniqueSummaries, isValidUniqueCountSummary } from 'utils/createDatedUniqueSummaries';

describe('UniqueCount validity tests', () => {
  it('correctly finds empty items to be invalid', () => {
    expect(isValidUniqueCountSummary(null)).toBe(false);
    expect(isValidUniqueCountSummary(undefined)).toBe(false);
  });

  it('correctly rejects unique count summaries with missing fields', () => {
    expect(isValidUniqueCountSummary({ upper: 23, lower: 12 })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: 23, lower: 12, estimate: null })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: 23, lower: 12, estimate: undefined })).toBe(false);

    expect(isValidUniqueCountSummary({ upper: 23, estimate: 15 })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: 23, lower: null, estimate: 15 })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: 23, lower: undefined, estimate: 15 })).toBe(false);

    expect(isValidUniqueCountSummary({ lower: 12, estimate: 17 })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: null, lower: 12, estimate: 17 })).toBe(false);
    expect(isValidUniqueCountSummary({ upper: undefined, lower: 12, estimate: 17 })).toBe(false);
  });

  it('accepts unique count summaries with all fields', () => {
    expect(isValidUniqueCountSummary({ upper: 23, lower: 12, estimate: 15 })).toBe(true);
    // Should work even if one value is falsey!
    expect(isValidUniqueCountSummary({ upper: 23, lower: 0, estimate: 15 })).toBe(true);
  });
});

describe('createDatedUniqueSummaries utiltiy testing', () => {
  it('creates arrays of dated uniques and skips the invalid ones', () => {
    const originalDataPile = {
      model: {
        id: 'id',
        name: 'foo',
        feature: {
          id: 'id',
          sketches: [
            {
              id: 'id',
              datasetTimestamp: 1,
              uniqueCount: { upper: 5, lower: 3, estimate: 4 },
            },
            {
              id: 'id',
              datasetTimestamp: 2,
              uniqueCount: { upper: 5, lower: 2 },
            },
            {
              id: 'id',
              datasetTimestamp: 3,
              uniqueCount: { upper: 3, lower: 1, estimate: 2 },
            },
          ],
        },
      },
    };
    const datedUniques = createDatedUniqueSummaries(originalDataPile);
    expect(datedUniques.length).toBe(2);
    expect(datedUniques[0]).toEqual({ dateInMillis: 1, upper: 5, lower: 3, estimate: 4 });
    expect(datedUniques[1]).toEqual({ dateInMillis: 3, upper: 3, lower: 1, estimate: 2 });
  });

  it('returns an empty array if given a data structure with missing major fields', () => {
    expect(createDatedUniqueSummaries({})).toEqual([]);
    expect(createDatedUniqueSummaries({ model: { id: 'id', name: 'foo' } })).toEqual([]);
    expect(
      createDatedUniqueSummaries({ model: { id: 'id', name: 'foo', feature: { id: 'id', sketches: [] } } }),
    ).toEqual([]);
  });
});
