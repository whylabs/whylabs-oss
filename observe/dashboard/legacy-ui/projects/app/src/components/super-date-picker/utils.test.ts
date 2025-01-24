import {
  createISOStringWithUpdatedHours,
  createFriendlyDisplayStringFromDateRange,
  dateConstructorToReadableISOString,
  getUTCHoursString,
  ReadableDateType,
  readableISOToStandardISO,
  timeObjectToString,
  timeStringToObject,
} from './utils';

it.each([
  ['02:30:03', { hours: 2, minutes: 30, seconds: 3 }, '02:30'],
  ['10:03:22', { hours: 10, minutes: 3, seconds: 22 }, '10:03'],
])('testing timeObjectToString for %p', (_, value, expected) => {
  expect(timeObjectToString(value)).toBe(expected);
});

it.each([
  ['02:30:03', { hours: 2, minutes: 30, seconds: 3 }],
  ['10:3:22', { hours: 10, minutes: 3, seconds: 22 }],
  ['10:30:--', { hours: 10, minutes: 30, seconds: 0 }],
  ['10::22', { hours: 10, minutes: 0, seconds: 22 }],
  [':1:22', { hours: 0, minutes: 1, seconds: 22 }],
  ['', { hours: 0, minutes: 0, seconds: 0 }],
])('testing timeStringToObject for %p', (timeString, expected) => {
  expect(timeStringToObject(timeString)).toStrictEqual(expected);
});

it.each([
  ['2023-11-20T21:10:00.000Z', '21:10'],
  ['2023-11-20 10:15', '10:15'],
])('testing getUTCHoursString for %p', (isoString, expected) => {
  expect(getUTCHoursString(isoString)).toStrictEqual(expected);
});

it.each([
  [new Date('2023-11-17 00:00:00'), '02:30', '2023-11-17T02:30Z'],
  [new Date('2023-11-11 20:00:00'), '22:30:00.000', '2023-11-11T22:30:00.000Z'],
  [new Date('2023-11-12'), '23:59:59.999', '2023-11-12T23:59:59.999Z'],
])('testing createISOStringWithUpdatedHours for %p', (date, timeObject, expected) => {
  expect(createISOStringWithUpdatedHours(date, timeObject)).toStrictEqual(expected);
});

describe('dateConstructorToReadableISOString', () => {
  it.each([
    ['2023-12-25T21h20m', '2023-12-25T21:20:00.000Z'],
    ['2023-12-06T00h00m', '1701820800000'],
    ['2023-12-08T23h59m', 1702079940000],
    [null, ''],
  ])('should return %p for input %p', (expected, input) => {
    expect(dateConstructorToReadableISOString(input)).toStrictEqual(expected);
  });

  it.each([
    ['2023-12-25', '2023-12-25T21:20:00.000Z'],
    ['2023-12-06', '1701820800000'],
    ['2023-12-08', 1702079940000],
  ])('should not include hours and return %p for input %p', (expected, input) => {
    expect(dateConstructorToReadableISOString(input, { includeHours: false })).toStrictEqual(expected);
  });
});

it.each([
  ['2023-12-25T21h20m', 'start', '2023-12-25T21:20Z'],
  ['2023-12-25T21h20m', 'end', '2023-12-25T21:20Z'],
  ['2023-12-06T00h', 'end', '2023-12-06T23:59Z'],
  ['2023-12-08', 'start', '2023-12-08T00:00Z'],
  ['2023-12-11', 'end', '2023-12-11T23:59Z'],
])('testing readableISOToStandardISO for %p', (input, type, expected) => {
  expect(readableISOToStandardISO(input, type as ReadableDateType)).toStrictEqual(expected);
});

it.only.each([
  [
    { from: new Date('December 21, 2023').setUTCHours(0), to: new Date('December 22, 2023').setUTCHours(0) },
    false,
    '2023/12/21 - 2023/12/22',
  ],
  [
    { from: new Date('January 1, 2024').setUTCHours(4), to: new Date('February 22, 2024').setUTCHours(15) },
    true,
    '2024/01/01 04:00 - 2024/02/22 15:00',
  ],
])('testing readableISOToStandardISO for %p', (input, includeHours, expected) => {
  expect(createFriendlyDisplayStringFromDateRange(input, includeHours)).toStrictEqual(expected);
});
