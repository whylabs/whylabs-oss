import { getDisplayText } from './getDisplayText';
import { PageTexts, TextRecord } from './types';

const TEST_TEXTS: PageTexts<TextRecord> = {
  DATA: {
    bar: 'DATA bar',
    foo: 'DATA foo',
  },
  MODEL: {
    bar: 'MODEL bar',
    foo: 'MODEL foo',
  },
};

describe('getDisplayText', () => {
  it.each(['bar', 'foo'])('should return the correct Model text for key %p', (key) => {
    const result = getDisplayText({ category: 'MODEL', key, texts: TEST_TEXTS });
    expect(result).toEqual(`MODEL ${key}`);
  });

  it.each(['bar', 'foo'])('should return the correct Dataset text for key %p', (key) => {
    const result = getDisplayText({ category: 'DATA', key, texts: TEST_TEXTS });
    expect(result).toEqual(`DATA ${key}`);
  });

  it('should return empty string for a category that does not exist', () => {
    // @ts-expect-error - testing invalid input
    const result = getDisplayText({ category: 'abc', key: 'bar', texts: TEST_TEXTS });
    expect(result).toEqual('');
  });

  it('should return empty string for a key that does not exist', () => {
    const result = getDisplayText({ category: 'MODEL', key: 'baz', texts: TEST_TEXTS });
    expect(result).toEqual('');
  });
});
