import { TimePeriod } from 'generated/graphql';
import { calculateTrailingWindowTimestamps, filterDatumToTopTenAndOther, GraphDatum } from '../batchUtils';

function generateOrderedGraphDatum(count: number, withReference = true): GraphDatum[] {
  const result: GraphDatum[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push({ name: `Item ${i}`, batchCount: i, referenceCount: withReference ? count - i : undefined });
  }
  return result;
}

function generateOrderedDataWithTrailingZeros(count: number, trailingZeros = 0, withReference = true): GraphDatum[] {
  const result: GraphDatum[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push({ name: `Item ${i}`, batchCount: i, referenceCount: withReference ? count - i : undefined });
  }
  for (let i = 0; i < trailingZeros; i += 1) {
    result.push({ name: `Item ${count + i}`, batchCount: 0, referenceCount: withReference ? 0 : undefined });
  }
  return result;
}

describe('Tests for filtering frequent items to the top ten', () => {
  it('does nothing when there are less than ten items', () => {
    const shortData = [
      { name: 'A', batchCount: 1 },
      { name: 'B', batchCount: 2, referenceCount: 3 },
    ];
    expect(filterDatumToTopTenAndOther(shortData)).toEqual(shortData);
  });

  it('filters to top ten when there are more than ten items without reference counts', () => {
    const longData = generateOrderedGraphDatum(15, false);
    const result = filterDatumToTopTenAndOther(longData);
    expect(result.length).toEqual(11);
    expect(result[10].name).toEqual('Other');
    expect(result[10].batchCount).toEqual(10);
    expect(result[10].referenceCount).toBeUndefined();
    // The smallest items in this case are the first items, so they should be the ones that are filtered out.
    expect(result.some((datum) => datum.name === 'Item 1')).toEqual(false);
  });

  it('filters to top ten when there are more than ten items with reference counts', () => {
    const longData = generateOrderedGraphDatum(25); // This means that we'll have 15 items in the "other" category for both batch and reference counts.
    const result = filterDatumToTopTenAndOther(longData);
    expect(result.length).toEqual(21);
    expect(result[20].name).toEqual('Other');
    expect(result[20].batchCount).toEqual(105);
    expect(result[20].referenceCount).toEqual(120);
    expect(result[0]).toEqual({ name: 'Item 24', batchCount: 24, referenceCount: 1 });
    expect(result[10]).toEqual({ name: 'Item 0', batchCount: 0, referenceCount: 25 });
  });

  it('filters to the top ten when there are overlapping items in the batch and reference counts', () => {
    const overlappingData = generateOrderedGraphDatum(15);
    const result = filterDatumToTopTenAndOther(overlappingData);
    expect(result.length).toEqual(16);
    expect(result[15].name).toEqual('Other');
    expect(result[15].batchCount).toEqual(10);
    expect(result[15].referenceCount).toEqual(15);
    expect(result[0]).toEqual({ name: 'Item 14', batchCount: 14, referenceCount: 1 });
    expect(result[10]).toEqual({ name: 'Item 0', batchCount: 0, referenceCount: 15 });
  });

  it('filters to the top ten when there are overlapping items in the batch and reference counts and trailing zeros', () => {
    const overlappingData = generateOrderedDataWithTrailingZeros(10, 5);
    const result = filterDatumToTopTenAndOther(overlappingData);
    expect(result.length).toEqual(11);
    expect(result[10].name).toEqual('Other');
    expect(result[10].batchCount).toEqual(0);
    expect(result[10].referenceCount).toEqual(0);
    expect(result[0]).toEqual({ name: 'Item 9', batchCount: 9, referenceCount: 1 });
    expect(result[9]).toEqual({ name: 'Item 0', batchCount: 0, referenceCount: 10 });
  });

  it('does not needlessly add an "Other" category when there are no trailing zeros', () => {
    const overlappingData = generateOrderedDataWithTrailingZeros(10, 0);
    const result = filterDatumToTopTenAndOther(overlappingData);
    expect(result.length).toEqual(10);
    expect(result[9].name).toEqual('Item 9');
    expect(result[9].batchCount).toEqual(9);
    expect(result[9].referenceCount).toEqual(1);
    expect(result.find((datum) => datum.name === 'Other')).toBeUndefined();
  });
});

describe('Tests for calculating trailing window date ranges', () => {
  const commonSelection = new Date('2023-07-03T00:00:00.000Z'); // Monday July 3, 2023 midnight UTC

  it('calculates the correct date range for a trailing window of 1 day', () => {
    const [from, to] = calculateTrailingWindowTimestamps(commonSelection.getTime(), 1, TimePeriod.P1D);
    expect(to).toEqual(commonSelection.getTime());
    expect(from).toEqual(new Date('2023-07-02T00:00:00.000Z').getTime());
  });

  it('calculates the correct date range for a trailing window measured in hours', () => {
    const [from, to] = calculateTrailingWindowTimestamps(commonSelection.getTime(), 25, TimePeriod.Pt1H);
    expect(to).toEqual(commonSelection.getTime());
    expect(from).toEqual(new Date('2023-07-01T23:00:00.000Z').getTime());
  });

  it('calculates the correct date range for a trailing window measured in weeks', () => {
    const [from, to] = calculateTrailingWindowTimestamps(commonSelection.getTime(), 3, TimePeriod.P1W);
    expect(to).toEqual(commonSelection.getTime());
    expect(from).toEqual(new Date('2023-06-12T00:00:00.000Z').getTime());
  });

  it('calculates the correct date range for a trailing window measured in months', () => {
    const monthStart = new Date('2023-07-01T00:00:00.000Z');
    const [from, to] = calculateTrailingWindowTimestamps(monthStart.getTime(), 2, TimePeriod.P1M);
    expect(to).toEqual(monthStart.getTime());
    expect(from).toEqual(new Date('2023-05-01T00:00:00.000Z').getTime());
  });

  it('handles wrapping around the end of the year', () => {
    const monthStart = new Date('2023-02-01T00:00:00.000Z');
    const [from, to] = calculateTrailingWindowTimestamps(monthStart.getTime(), 3, TimePeriod.P1M);
    expect(to).toEqual(monthStart.getTime());
    expect(from).toEqual(new Date('2022-11-01T00:00:00.000Z').getTime());
  });

  it.each([
    ['Testing last 7 batches in hourly', 1686182400000, 1686157200000, TimePeriod.Pt1H],
    ['Testing last 7 batches in daily', 1686182400000, 1685577600000, TimePeriod.P1D],
    ['Testing last 7 batches in weekly', 1686182400000, 1681948800000, TimePeriod.P1W],
    ['Testing last 7 batches in monthly', 1686182400000, 1667865600000, TimePeriod.P1M],
  ])('%p', (_, inputDate, expected, granularity) => {
    const [from, to] = calculateTrailingWindowTimestamps(inputDate, 7, granularity);
    expect(from).toEqual(expected);
    expect(to).toEqual(inputDate);
  });
});
