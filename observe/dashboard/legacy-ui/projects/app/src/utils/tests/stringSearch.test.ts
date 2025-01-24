import { passesSearchFilter } from 'utils/stringSearch';

describe('Search filter tests', () => {
  it('always says true for empty search', () => {
    expect(passesSearchFilter('foo', undefined)).toBe(true);
    expect(passesSearchFilter('', undefined)).toBe(true);
  });

  it('fails things that are excluded by the search filter', () => {
    expect(passesSearchFilter('foo', 'ab')).toBe(false);
    expect(passesSearchFilter('bar', 'br')).toBe(false);
  });

  it('passes things that contain the search string', () => {
    expect(passesSearchFilter('hello', 'll')).toBe(true);
    expect(passesSearchFilter('goodbye', 'goodbye')).toBe(true);
    expect(passesSearchFilter('HELLO', 'e')).toBe(true);
  });
});
