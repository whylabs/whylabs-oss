import {
  getDomainFromEmail,
  handlePlural,
  nextAlphabetLetter,
  parseJsonContent,
  stringMax,
  upperCaseFirstLetterOfEachWord,
  upperCaseFirstLetterOnly,
  validateEmail,
} from './stringUtils';

describe('stringUtils', () => {
  describe('nextAlphabetLetter()', () => {
    it.each([
      ['a', 'b'],
      ['c', 'd'],
      ['l', 'm'],
      ['x', 'y'],
    ])('should return %s when given %s', (input, expected) => {
      expect(nextAlphabetLetter(input)).toBe(expected);
    });
  });

  describe('parseJsonContent()', () => {
    it('should return null when given undefined', () => {
      expect(parseJsonContent(undefined)).toBeNull();
    });

    it('should return null when given invalid JSON', () => {
      expect(parseJsonContent('invalid json')).toBeNull();
    });

    it('should return the parsed JSON when given valid JSON', () => {
      const input = '{"foo": "bar"}';
      expect(parseJsonContent(input)).toStrictEqual({ foo: 'bar' });
    });

    it('should return the parsed JSON when given valid JSON #2', () => {
      const input = '{"age": 2, "list": [1, 2, 3], "name": "John"}';
      expect(parseJsonContent(input)).toStrictEqual({
        age: 2,
        list: [1, 2, 3],
        name: 'John',
      });
    });
  });

  describe('String abbreviation tests', () => {
    it('returns the input string if it is short enough', () => {
      expect(stringMax('abcde', 5)).toEqual('abcde');
      expect(stringMax('', 4)).toEqual('');
      expect(stringMax('cat', 100)).toEqual('cat');
    });

    it('returns the raw ellpsis values if you really want them', () => {
      expect(stringMax('abcdefg', 2, true)).toEqual('ab...');
      expect(stringMax('abcdefg', 2)).toEqual('ab\u2026');
    });

    it('ignores silly input', () => {
      expect(stringMax('hello', 0)).toEqual('hello');
      expect(stringMax('what', -55)).toEqual('what');
      expect(stringMax('get outta here', 1.5)).toEqual('get outta here');
    });

    it('abbreviates when it should', () => {
      expect(stringMax('abcdefg', 4)).toEqual('abcd\u2026');
      expect(stringMax('ABcdEFG', 3)).toEqual('ABc\u2026');
    });

    it('removes an underscore if the split string ends in one', () => {
      expect(stringMax('abc_efg', 4)).toEqual('abc\u2026');
    });

    it('cuts at the default value', () => {
      expect(stringMax('abcdefghijklmnopqrstuvwxyz')).toEqual('abcdefghijklmnopqrstuvwx\u2026');
    });
  });

  describe('upperCaseFirstLetterOnly', () => {
    it.each([
      ['', ''],
      ['a', 'A'],
      ['hello', 'Hello'],
      ['HELLO', 'Hello'],
      ['hello world', 'Hello world'],
      ['heLLO WORLD', 'Hello world'],
      ['hello_world', 'Hello_world'],
      ['heLLO_wORld', 'Hello_world'],
      ['Lorem ipsUM DOLOr', 'Lorem ipsum dolor'],
    ])('when given %s should return %s', (input, expected) => {
      expect(upperCaseFirstLetterOnly(input)).toBe(expected);
    });
  });

  describe('upperCaseFirstLetterOfEachWord', () => {
    it.each([
      ['hello', 'Hello'],
      ['HELLO', 'Hello'],
      ['hello world', 'Hello World'],
      ['heLLO WORLD', 'Hello World'],
      ['hello_world', 'Hello_world'],
      ['heLLO_wORld', 'Hello_world'],
      ['Lorem ipsUM DOLOr', 'Lorem Ipsum Dolor'],
    ])('when given %s should return %s', (input, expected) => {
      expect(upperCaseFirstLetterOfEachWord(input)).toBe(expected);
    });
  });

  describe('handlePlural', () => {
    it.each([
      ['apple', 1, 'apple'],
      ['apple', 2, 'apples'],
      ['car', 0, 'cars'],
      ['car', 1, 'car'],
      ['car', 5, 'cars'],
    ])('when given %s and %d should return %s', (word, amount, expected) => {
      expect(handlePlural(word, amount)).toBe(expected);
    });
  });

  describe('validateEmail', () => {
    it.each([
      ['test@example.com', true],
      ['invalid-email', false],
      ['another.test@domain.co', true],
      ['@missingusername.com', false],
      ['username@.com', false],
      ['username@domain', false],
      ['username@domain.c', false],
    ])('when given %s should return %s', (input, expected) => {
      expect(validateEmail(input)).toBe(expected);
    });
  });

  describe('getDomainFromEmail', () => {
    it.each([
      ['test@example.com', 'example'],
      ['another.test@domain.co', 'domain'],
    ])('when given %s should return %s', (input, expected) => {
      expect(getDomainFromEmail(input)).toBe(expected);
    });

    it.each(['invalid-email', '@missingusername.com', 'username@.com', 'username@domain', 'username@domain.c'])(
      'should return null for invalid email %p',
      (input) => {
        expect(getDomainFromEmail(input)).toBeNull();
      },
    );
  });
});
