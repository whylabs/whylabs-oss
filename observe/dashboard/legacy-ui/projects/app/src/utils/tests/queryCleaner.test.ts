import { cleanupQueryString, removeKeys } from '../queryCleaner';

describe('Tests of the query string cleaning utility', () => {
  it('handles simple situations correctly', () => {
    const original = 'likes=foo&name=steve&color=blue';
    expect(removeKeys(['name'], original)).toEqual('likes=foo&color=blue');
    expect(removeKeys(['likes', 'dislikes'], original)).toEqual('name=steve&color=blue');
  });

  it('preserves question marks', () => {
    const original = '?likes=foo&name=steve&color=blue';
    expect(removeKeys(['name'], original)).toEqual('?likes=foo&color=blue');
  });

  it('removes duplicate keys', () => {
    const original = 'likes=foo&name=joe&color=red&likes=bar&name=steve&color=green';
    expect(removeKeys(['name'], original)).toEqual('likes=foo&likes=bar&color=red&color=green');
  });

  it('handles empty values', () => {
    const emptyOriginal = '';
    const original = 'likes=foo&name=steve&color=blue';

    expect(removeKeys(['name', 'birthday', 'height'], emptyOriginal)).toEqual('');
    expect(removeKeys([], original)).toEqual(original);
  });
});

describe('cleanupQueryString', () => {
  it('should return empty string when queryString is empty', () => {
    expect(cleanupQueryString({ keysToKeep: [], queryString: '' })).toBe('');
  });

  it('should return empty string when queryString is only a question mark', () => {
    expect(cleanupQueryString({ keysToKeep: [], queryString: '?' })).toBe('');
  });

  it('should return empty string when queryString starts with question mark but has no querystring', () => {
    expect(cleanupQueryString({ keysToKeep: [], queryString: '?foo=bar' })).toBe('');
  });

  it('should return an empty query string when there are no keys to preserve', () => {
    expect(cleanupQueryString({ keysToKeep: [], queryString: '?foo=bar&baz=qux' })).toBe('');
  });

  it.each([
    [['foo'], '?foo=bar'],
    [['baz'], '?baz=qux'],
    [['foo', 'baz'], '?foo=bar&baz=qux'],
  ])('should preserve keys when they are the only keys in the query string #%#', (keysToKeep, expected) => {
    expect(cleanupQueryString({ keysToKeep, queryString: '?foo=bar&baz=qux' })).toBe(expected);
  });

  it('should preserve keys when they are the only keys in the query string without question mark', () => {
    expect(cleanupQueryString({ keysToKeep: ['foo', 'baz'], queryString: 'foo=bar&baz=qux' })).toBe('foo=bar&baz=qux');
  });
});
