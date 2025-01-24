import { mergeCountArrays, mergeCounts } from '../utils';

describe('Testing itemcount merge function', () => {
  it('Merges two non-empty itemcounts', () => {
    const merged = mergeCounts(
      { id: 'foo', name: 'bar', count: 5, color: 'x' },
      { id: 'oof', name: 'rab', count: 2, color: 'y' },
    );
    expect(merged).toEqual({ id: 'foo', name: 'bar', count: 7, color: 'x' });
  });

  it('Handles one item being undefined', () => {
    const original = { id: 'foo', name: 'bar', count: 5, color: 'x' };
    const merged = mergeCounts({ id: 'foo', name: 'bar', count: 5, color: 'x' }, undefined);
    expect(merged).toEqual(original);
  });
});

describe('Testing item count array merge function', () => {
  it('Merges two simple arrays', () => {
    const firstItemCounts = [
      { id: 'foo', name: 'bar', count: 5, color: 'x' },
      { id: 'foo2', name: 'rab', count: 2, color: 'y' },
    ];
    const secondItemCounts = [
      { id: 'foo', name: 'bar', count: 3, color: 'x' },
      { id: 'foo3', name: 'rab', count: 1, color: 'y' },
    ];
    const merged = mergeCountArrays(firstItemCounts, secondItemCounts);
    const expected = [
      { id: 'foo', name: 'bar', count: 8, color: 'x' },
      { id: 'foo2', name: 'rab', count: 2, color: 'y' },
      { id: 'foo3', name: 'rab', count: 1, color: 'y' },
    ];
    expect(merged).toEqual(expected);
  });

  it('Handles empty arrays', () => {
    const firstItemCounts = [
      { id: 'foo', name: 'bar', count: 5, color: 'x' },
      { id: 'foo2', name: 'rab', count: 2, color: 'y' },
    ];
    const merged = mergeCountArrays([], firstItemCounts);
    expect(merged).toEqual(firstItemCounts);
  });

  it('Handles a ridiculous case like an array having duplicate ids', () => {
    const strange = [
      { id: 'foo', name: 'bar', count: 8, color: 'x' },
      { id: 'foo', name: 'rab', count: 2, color: 'y' },
      { id: 'foo', name: 'xyz', count: 1, color: 'z' },
    ];
    const merged = mergeCountArrays(strange, []);
    expect(merged).toEqual([{ id: 'foo', name: 'xyz', count: 11, color: 'z' }]);
  });

  it('Returns a consistent sort based on the id field', () => {
    const firstItemCounts = [
      { id: 'foo', name: 'bar', count: 5, color: 'x' },
      { id: 'foo2', name: 'rab', count: 2, color: 'y' },
    ];
    const secondItemCounts = [
      { id: 'foo3', name: 'xyz', count: 3, color: 'z' },
      { id: 'foo', name: 'bar', count: 1, color: 'x' },
    ];
    const merged = mergeCountArrays(firstItemCounts, secondItemCounts);
    const expected = [
      { id: 'foo', name: 'bar', count: 6, color: 'x' },
      { id: 'foo2', name: 'rab', count: 2, color: 'y' },
      { id: 'foo3', name: 'xyz', count: 3, color: 'z' },
    ];
    expect(merged).toEqual(expected);
  });
});
