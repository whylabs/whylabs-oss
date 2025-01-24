import { getUTCEndOfMonth, getUTCEndOfWeek, getUTCStartOfWeek } from '../dateRangeUtils';

describe('Testing UTC time manipulation', () => {
  const fixedNow = new Date('2023-10-24T22:00:00.000-04:00'); // Tuesday, Oct 24, 2023, 10PM EDT
  it('gets the expected start of week', () => {
    const endOfWeek = getUTCEndOfWeek(fixedNow);
    expect(endOfWeek.getUTCHours()).toEqual(23);
    expect(endOfWeek.getUTCMinutes()).toEqual(59);
    expect(endOfWeek.getUTCSeconds()).toEqual(59);
    expect(endOfWeek.getUTCMilliseconds()).toEqual(999);
    expect(endOfWeek.getUTCDate()).toEqual(28); // The end of that week, on Saturday
    expect(endOfWeek.getUTCDay()).toEqual(6);
    expect(fixedNow.getUTCDate()).toEqual(25); // The function should not alter the input
  });

  it('gets the expected start of week for a different day', () => {
    const startOfWeek = getUTCStartOfWeek(fixedNow);
    expect(startOfWeek.getUTCHours()).toEqual(0);
    expect(startOfWeek.getUTCMinutes()).toEqual(0);
    expect(startOfWeek.getUTCSeconds()).toEqual(0);
    expect(startOfWeek.getUTCMilliseconds()).toEqual(0);
    expect(startOfWeek.getUTCDate()).toEqual(22); // The start of that week, on Sunday
    expect(startOfWeek.getUTCDay()).toEqual(0);
    expect(fixedNow.getUTCDate()).toEqual(25); // The function should not alter the input
  });

  it('gets the expected end of month', () => {
    const endOfMonth = getUTCEndOfMonth(fixedNow);
    expect(endOfMonth.getUTCHours()).toEqual(23);
    expect(endOfMonth.getUTCMinutes()).toEqual(59);
    expect(endOfMonth.getUTCSeconds()).toEqual(59);
    expect(endOfMonth.getUTCMilliseconds()).toEqual(999);
    expect(endOfMonth.getUTCDate()).toEqual(31); // The end of that month
    expect(endOfMonth.getUTCMonth()).toEqual(9);
    expect(fixedNow.getUTCDate()).toEqual(25); // The function should not alter the input
  });
});
