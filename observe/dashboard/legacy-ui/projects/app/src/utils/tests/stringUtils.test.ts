import { getDomain, stringMax, validateEmail } from '@whylabs/observatory-lib';
import { upperCaseFirstLetterOfEachWord, upperCaseFirstLetterOnly } from '../stringUtils';

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
  ])(`when given %s should return %s`, (input, expected) => {
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
  ])(`when given %s should return %s`, (input, expected) => {
    expect(upperCaseFirstLetterOfEachWord(input)).toBe(expected);
  });
});

describe('Validate email tests', () => {
  it('accepts ordinary emails', () => {
    expect(validateEmail('test@whylabs.ai')).toBe(true);
    expect(validateEmail('hello@gmail.com')).toBe(true);
    expect(validateEmail('something.more.complicated@slipperyfish.co.uk')).toBe(true);
  });

  it('rejects plainly bad things', () => {
    expect(validateEmail('foo@bar')).toBe(false);
    expect(validateEmail('so@many@at.com')).toBe(false);
    expect(validateEmail('espn.com')).toBe(false);
  });

  it('rejects silly things', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('one two three four this is not an email@songs.com')).toBe(false);
  });

  it('rejects sneaky things', () => {
    expect(validateEmail('foo@.com')).toBe(false);
    expect(validateEmail('foo.@bar.')).toBe(false);
  });
});

describe('Get email domain tests', () => {
  it('fetches expected domains', () => {
    expect(getDomain('user@whylabs.ai')).toEqual('whylabs');
    expect(getDomain('foo@ourcustomer.co.uk')).toEqual('ourcustomer');
    expect(getDomain('bestFriends.forever@MyLittlePony.com')).toBe('mylittlepony');
  });

  it('rejects bad input', () => {
    expect(getDomain('foobar@noise')).toBe(null);
  });
});
