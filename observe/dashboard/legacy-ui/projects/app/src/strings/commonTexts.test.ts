import { createCommonTexts } from './commonTexts';

describe('createCommonTexts', () => {
  it.each([
    ['anomaliesInRange', 'Anomalies in range'],
    ['batchFrequency', 'Batch frequency'],
    ['discrete', 'Discrete'],
    ['errorLoadingData', 'Error loading data'],
    ['noAnomalies', 'No anomalies'],
    ['noAnomaliesData', 'No anomalies in range'],
    ['noData', 'No data'],
    ['noDataFound', 'No data found'],
    ['noSegments', 'No segments'],
    ['nonDiscrete', 'Non-Discrete'],
    ['unknown', 'Unknown'],
  ])('should return common text for %p', (key, expected) => {
    // @ts-expect-error - TS don't like the key as string in the test
    expect(createCommonTexts({})[key]).toEqual(expected);
  });

  it('should return custom text for a key that exists in common texts', () => {
    const customText = 'Custom text';
    expect(createCommonTexts({ noDataFound: customText }).noDataFound).toEqual(customText);
  });

  it('should include custom text object', () => {
    const texts = {
      foo: 'Bar',
      baz: 'Qux',
      something: 'Else',
    };
    expect(createCommonTexts(texts)).toStrictEqual(expect.objectContaining(texts));
  });
});
