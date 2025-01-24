import { FeatureType } from 'generated/graphql';
import {
  createDatedSchemas,
  DatedSchema,
  filterInvalidAndMapToExpected,
  isValidSchema,
  isValidTypeCount,
} from 'utils/createDatedSchemas';

describe('isValidSchema tests', () => {
  it('finds null/undefined schemas invalid', () => {
    expect(isValidSchema(null)).toBe(false);
    expect(isValidSchema(undefined)).toBe(false);
  });

  it('finds schemas that have undefined/null inferences invalid', () => {
    expect(isValidSchema({ typeCounts: [] })).toBe(false);
    expect(isValidSchema({ inference: undefined, typeCounts: [] })).toBe(false);
  });

  it('finds valid schemas valid, even with falsey values', () => {
    expect(isValidSchema({ inference: { type: FeatureType.Null, ratio: 0, count: 1 }, typeCounts: [] })).toBe(true);
    expect(isValidSchema({ inference: { type: FeatureType.Integer, ratio: 0.3, count: 5 }, typeCounts: [] })).toBe(
      true,
    );
    expect(isValidSchema({ inference: { type: FeatureType.Fraction, ratio: 0.99, count: 10 }, typeCounts: [] })).toBe(
      true,
    );
  });
});

describe('isValidTypeCount tests', () => {
  it('finds invalid typecounts invalid', () => {
    expect(isValidTypeCount({})).toBe(false);
    expect(isValidTypeCount({ type: FeatureType.Fraction, count: null })).toBe(false);
    expect(isValidTypeCount({ type: FeatureType.Fraction, count: undefined })).toBe(false);
    expect(isValidTypeCount({ type: FeatureType.Fraction })).toBe(false);
    expect(isValidTypeCount({ count: 22 })).toBe(false);
  });

  it('finds valid typecounts valid', () => {
    expect(isValidTypeCount({ type: FeatureType.Boolean, count: 33 })).toBe(true);
    expect(isValidTypeCount({ type: FeatureType.Null, count: 0 })).toBe(true);
  });
});

describe('filterInvalidAndMapToExpected tests', () => {
  it('maps to the correct type', () => {
    const expected: DatedSchema = {
      dateInMillis: 1,
      typeCounts: [],
      inference: { type: FeatureType.Null, ratio: 0.5 },
    };
    expected.typeCounts = filterInvalidAndMapToExpected([{ type: FeatureType.Fraction, count: 5 }]);
    expect(expected.typeCounts.length).toBe(1);
    expect(expected.typeCounts).toEqual([{ type: FeatureType.Fraction, count: 5 }]);
  });

  it('filters invalid typecounts and maps the rest', () => {
    const expected: DatedSchema = {
      dateInMillis: 1,
      typeCounts: [],
      inference: { type: FeatureType.Null, ratio: 0.5 },
    };
    expected.typeCounts = filterInvalidAndMapToExpected([
      { type: FeatureType.Fraction, count: 5 },
      { type: FeatureType.Null },
      { type: FeatureType.Text, count: 4 },
      { count: 50 },
    ]);
    expect(expected.typeCounts.length).toBe(2);
    expect(expected.typeCounts).toEqual([
      { type: FeatureType.Fraction, count: 5 },
      { type: FeatureType.Text, count: 4 },
    ]);
  });
});

describe('createDatedSchemas tests', () => {
  it('returns empty array when fed nulls along the data object path', () => {
    expect(createDatedSchemas(null)).toEqual([]);
    expect(createDatedSchemas({ model: { id: 'id', name: 'foo' } })).toEqual([]);
    expect(createDatedSchemas({ model: { id: 'id', name: 'foo', feature: { id: 'id', sketches: [] } } })).toEqual([]);
    expect(
      createDatedSchemas({
        model: { id: 'id', name: 'foo', feature: { id: 'id', sketches: [{ id: 'id', datasetTimestamp: 1 }] } },
      }),
    ).toEqual([]);
  });

  it('returns expected filtered arrays', () => {
    const inputItem = {
      model: {
        id: 'id',
        name: 'foo',
        feature: {
          id: 'id',
          sketches: [
            {
              id: 'id',
              datasetTimestamp: 1,
              schemaSummary: {
                inference: {
                  type: FeatureType.Text,
                  ratio: 0.5,
                  count: 100,
                },
                typeCounts: [
                  {
                    type: FeatureType.Text,
                    count: 55,
                  },
                  { type: FeatureType.Boolean, count: 54 },
                  { type: FeatureType.Unknown, count: 0 },
                  { type: FeatureType.Fraction, count: 0 },
                ],
              },
            },
            {
              id: 'id',
              datasetTimestamp: 2,
              schemaSummary: {
                typeCounts: [
                  {
                    type: FeatureType.Text,
                    count: 55,
                  },
                  { type: FeatureType.Boolean, count: 54 },
                  { type: FeatureType.Unknown, count: 0 },
                  { type: FeatureType.Fraction, count: 0 },
                ],
              },
            },
            {
              id: 'id',
              datasetTimestamp: 3,
              schemaSummary: {
                inference: {
                  type: FeatureType.Text,
                  ratio: 0.6,
                  count: 40,
                },
                typeCounts: [
                  {
                    type: FeatureType.Text,
                    count: 108,
                  },
                  { type: FeatureType.Boolean },
                  { type: FeatureType.Null, count: 54 },
                  { type: FeatureType.Unknown, count: 1 },
                  { type: FeatureType.Fraction, count: 0 },
                ],
              },
            },
          ],
        },
      },
    };
    const output = createDatedSchemas(inputItem);
    expect(output.length).toBe(2);
    expect(output[0].dateInMillis).toBe(1);
    expect(output[0].inference.type).toBe(FeatureType.Text);
    expect(output[0].inference.ratio).toBeCloseTo(0.5);
    expect(output[0].typeCounts.length).toBe(3);

    expect(output[1].dateInMillis).toBe(3);
    expect(output[1].inference.type).toBe(FeatureType.Text);
    expect(output[1].inference.ratio).toBeCloseTo(0.6);
    expect(output[1].typeCounts.length).toBe(3);
  });

  it('handles simple cases where every type is present', () => {
    const inputItem = {
      model: {
        id: 'id',
        name: 'foo',
        feature: {
          id: 'id',
          sketches: [
            {
              id: 'id',
              datasetTimestamp: 1,
              schemaSummary: {
                inference: {
                  type: FeatureType.Text,
                  ratio: 0.5,
                  count: 123,
                },
                typeCounts: [
                  {
                    type: FeatureType.Text,
                    count: 55,
                  },
                  { type: FeatureType.Boolean, count: 54 },
                  { type: FeatureType.Unknown, count: 1 },
                  { type: FeatureType.Fraction, count: 2 },
                  { type: FeatureType.Integer, count: 3 },
                  { type: FeatureType.Null, count: 4 },
                ],
              },
            },
          ],
        },
      },
    };
    const output = createDatedSchemas(inputItem);
    expect(output.length).toBe(1);
    expect(output[0].typeCounts.length).toBe(6);
  });
});
