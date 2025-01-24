import { JSONValue } from '~/types/genericTypes';
import { SortDirection } from '~/types/sortTypes';

import sortByType, { getSortFnByType, sortByBooleanFn, sortByNumberFn, sortByStringFn } from './genericSorting';
import {
  booleanArrayMocks,
  numberArrayMocks,
  oneAccessorBooleanMocks,
  oneAccessorNumberMocks,
  oneAccessorStringMocks,
  stringArrayMocks,
  threeAccessorsBooleanMocks,
  threeAccessorsNumberMocks,
  threeAccessorsStringMocks,
  twoAccessorsBooleanMocks,
  twoAccessorsNumberMocks,
  twoAccessorsStringMocks,
} from './test-resources/genericSortingMocks';

describe('Testing sortByType function without accessor', () => {
  it.each([
    ['number array - ASC', numberArrayMocks.input, SortDirection.Asc, numberArrayMocks.ascOutput],
    ['number array - DESC', numberArrayMocks.input, SortDirection.Desc, numberArrayMocks.descOutput],
    ['string array - ASC', stringArrayMocks.input, SortDirection.Asc, stringArrayMocks.ascOutput],
    ['string array - DESC', stringArrayMocks.input, SortDirection.Desc, stringArrayMocks.descOutput],
    ['boolean array - ASC', booleanArrayMocks.input, SortDirection.Asc, booleanArrayMocks.ascOutput],
    ['boolean array - DESC', booleanArrayMocks.input, SortDirection.Desc, booleanArrayMocks.descOutput],
  ])('test %p', (_, data, direction, expected) => {
    const sorted = sortByType<Exclude<JSONValue, undefined>>(data, direction);
    expect(sorted).toStrictEqual(expected);
  });
});

describe('Testing sortByType function with one accessor', () => {
  it.each([
    [
      'number `timestamp` accessor - ASC',
      ['timestamp'],
      oneAccessorNumberMocks.input,
      SortDirection.Asc,
      oneAccessorNumberMocks.ascOutput,
    ],
    [
      'number `timestamp` accessor - DESC',
      ['timestamp'],
      oneAccessorNumberMocks.input,
      SortDirection.Desc,
      oneAccessorNumberMocks.descOutput,
    ],
    [
      'string `name` accessor - ASC',
      ['name'],
      oneAccessorStringMocks.input,
      SortDirection.Asc,
      oneAccessorStringMocks.ascOutput,
    ],
    [
      'string `name` accessor - DESC',
      ['name'],
      oneAccessorStringMocks.input,
      SortDirection.Desc,
      oneAccessorStringMocks.descOutput,
    ],
    [
      'boolean `enabled` accessor - ASC',
      ['enabled'],
      oneAccessorBooleanMocks.input,
      SortDirection.Asc,
      oneAccessorBooleanMocks.ascOutput,
    ],
    [
      'boolean `enabled` accessor - DESC',
      ['enabled'],
      oneAccessorBooleanMocks.input,
      SortDirection.Desc,
      oneAccessorBooleanMocks.descOutput,
    ],
  ])('test %p', (_, accessors, data, direction, expected) => {
    const sorted = sortByType<Exclude<JSONValue, undefined>>(data, direction, accessors);
    expect(sorted).toStrictEqual(expected);
  });
});

describe('Testing sortByType function with two accessors', () => {
  it.each([
    [
      'number `dataAvailability.timestamp` accessor - ASC',
      ['dataAvailability', 'timestamp'],
      twoAccessorsNumberMocks.input,
      SortDirection.Asc,
      twoAccessorsNumberMocks.ascOutput,
    ],
    [
      'number `dataAvailability.timestamp` accessor - DESC',
      ['dataAvailability', 'timestamp'],
      twoAccessorsNumberMocks.input,
      SortDirection.Desc,
      twoAccessorsNumberMocks.descOutput,
    ],
    [
      'string `monitor.displayName` accessor - ASC',
      ['monitor', 'displayName'],
      twoAccessorsStringMocks.input,
      SortDirection.Asc,
      twoAccessorsStringMocks.ascOutput,
    ],
    [
      'string `monitor.displayName` accessor - DESC',
      ['monitor', 'displayName'],
      twoAccessorsStringMocks.input,
      SortDirection.Desc,
      twoAccessorsStringMocks.descOutput,
    ],
    [
      'boolean `monitor.enabled` accessor - ASC',
      ['monitor', 'enabled'],
      twoAccessorsBooleanMocks.input,
      SortDirection.Asc,
      twoAccessorsBooleanMocks.ascOutput,
    ],
    [
      'boolean `monitor.enabled` accessor - DESC',
      ['monitor', 'enabled'],
      twoAccessorsBooleanMocks.input,
      SortDirection.Desc,
      twoAccessorsBooleanMocks.descOutput,
    ],
  ])('test %p', (_, accessors, data, direction, expected) => {
    const sorted = sortByType<Exclude<JSONValue, undefined>>(data, direction, accessors);
    expect(sorted).toStrictEqual(expected);
  });
});

describe('Testing sortByType function with three accessors', () => {
  it.each([
    [
      'number `model.dataAvailability.timestamp` accessor - ASC',
      ['model', 'dataAvailability', 'timestamp'],
      threeAccessorsNumberMocks.input,
      SortDirection.Asc,
      threeAccessorsNumberMocks.ascOutput,
    ],
    [
      'number `model.dataAvailability.timestamp` accessor - DESC',
      ['model', 'dataAvailability', 'timestamp'],
      threeAccessorsNumberMocks.input,
      SortDirection.Desc,
      threeAccessorsNumberMocks.descOutput,
    ],
    [
      'string `monitor.analyzer.metric` accessor - ASC',
      ['monitor', 'analyzer', 'metric'],
      threeAccessorsStringMocks.input,
      SortDirection.Asc,
      threeAccessorsStringMocks.ascOutput,
    ],
    [
      'string `monitor.analyzer.metric` accessor - DESC',
      ['monitor', 'analyzer', 'metric'],
      threeAccessorsStringMocks.input,
      SortDirection.Desc,
      threeAccessorsStringMocks.descOutput,
    ],
    [
      'string `monitoooor.analyzer.metric` wrong accessor - DESC (return same as input)',
      ['monitoooor', 'analyzer', 'metric'],
      threeAccessorsStringMocks.input,
      SortDirection.Desc,
      threeAccessorsStringMocks.input,
    ],
    [
      'boolean `monitor.analyzer.enabled` accessor - DESC',
      ['monitor', 'analyzer', 'enabled'],
      threeAccessorsBooleanMocks.input,
      SortDirection.Desc,
      threeAccessorsBooleanMocks.descOutput,
    ],
    [
      'boolean `monitoooor.analyzer.enabled` wrong accessor - DESC (return same as input)',
      ['monitoooor', 'analyzer', 'enabled'],
      threeAccessorsBooleanMocks.input,
      SortDirection.Desc,
      threeAccessorsBooleanMocks.input,
    ],
  ])('test %p', (_, accessors, data, direction, expected) => {
    const sorted = sortByType<Exclude<JSONValue, undefined>>(data, direction, accessors);
    expect(sorted).toStrictEqual(expected);
  });
});

describe('Testing getSortFnByType function', () => {
  it.each([
    ['number (both params)', 1, 3, sortByNumberFn],
    ['number (only a)', 1, null, sortByNumberFn],
    ['number (only b)', undefined, 1, sortByNumberFn],
    ['string (both params)', 'zzz', 'aaa', sortByStringFn],
    ['string (only a)', 'zzz', null, sortByStringFn],
    ['string (only b)', undefined, 'aaa', sortByStringFn],
    ['boolean (both params)', true, false, sortByBooleanFn],
    ['boolean (only a)', true, null, sortByBooleanFn],
    ['boolean (only b)', undefined, false, sortByBooleanFn],
    ['unsupported', [1], [2], undefined],
  ])('%p type', (_, a, b, expected) => {
    const fn = getSortFnByType<JSONValue>(a, b);
    expect(fn).toEqual(expected);
  });
});

describe('Testing sortByNumberFn function', () => {
  it.each([
    ['number (both params) - ASC', [1, 3], SortDirection.Asc, 1 - 3],
    ['number (both params) - DESC', [1, 3], SortDirection.Desc, 3 - 1],
    ['number (only a) - ASC', [1, null], SortDirection.Asc, 1],
    ['number (only a) - DESC', [1, null], SortDirection.Desc, -1],
    ['number (only b) - ASC', [null, 5], SortDirection.Asc, -1],
    ['number (only b) - DESC', [null, 5], SortDirection.Desc, 1],
    ['unsupported - DESC', ['aaa', undefined], SortDirection.Desc, 0],
    ['unsupported - ASC', ['aaa', undefined], SortDirection.Asc, 0],
  ])('%p type', (_, params, direction, expected) => {
    const result = sortByNumberFn<JSONValue>(params[0], params[1], direction);
    expect(result).toEqual(expected);
  });
});

describe('Testing sortByStringFn function', () => {
  it.each([
    ['string (both params) - ASC', ['bbb', 'aaa'], SortDirection.Asc, 1],
    ['string (both params) - DESC', ['bbb', 'aaa'], SortDirection.Desc, -1],
    ['string (only a) - ASC', ['aaa', null], SortDirection.Asc, 1],
    ['string (only a) - DESC', ['aaa', null], SortDirection.Desc, -1],
    ['string (only b) - ASC', [null, 'zzz'], SortDirection.Asc, -1],
    ['string (only b) - DESC', [null, 'zzz'], SortDirection.Desc, 1],
    ['unsupported - DESC', [5, undefined], SortDirection.Desc, 0],
    ['unsupported - ASC', [true, undefined], SortDirection.Asc, 0],
  ])('%p type', (_, params, direction, expected) => {
    const result = sortByStringFn<JSONValue>(params[0], params[1], direction);
    expect(result).toEqual(expected);
  });
});

describe('Testing sortByBooleanFn function', () => {
  it.each([
    ['boolean (both params) - ASC', [true, false], SortDirection.Asc, 1],
    ['boolean (both params) - DESC', [true, false], SortDirection.Desc, -1],
    ['boolean (only a) - ASC', [true, null], SortDirection.Asc, 1],
    ['boolean (only a) - DESC', [false, null], SortDirection.Desc, -1],
    ['boolean (only b) - ASC', [null, false], SortDirection.Asc, -1],
    ['boolean (only b) - DESC', [null, true], SortDirection.Desc, 1],
    ['unsupported - DESC', ['dooh', undefined], SortDirection.Desc, 0],
    ['unsupported - ASC', [null, undefined], SortDirection.Asc, 0],
  ])('%p type', (_, params, direction, expected) => {
    const result = sortByBooleanFn<JSONValue>(params[0], params[1], direction);
    expect(result).toEqual(expected);
  });
});
