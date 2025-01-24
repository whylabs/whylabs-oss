import { DateRangeType } from 'hooks/lagacyDateRangeUtils';
import {
  createQueryDateRange,
  ensureDateRangeIsAtLeastOneDay,
  getNumericQueryValues,
  getQueryValues,
} from '../queryUtils';

describe('Query string parsing test', () => {
  it('handles empty query strings', () => {
    const found = getQueryValues('', 'foo');
    expect(found).toEqual([]);
  });

  it('returns nothing when given a key that is not there', () => {
    const found = getQueryValues('?hello=world&parts=12345', 'foo');
    expect(found).toEqual([]);
  });

  it('finds one item we give it a good key', () => {
    const found = getQueryValues('?hello=world&parts=12345', 'hello');
    expect(found).toEqual(['world']);
  });

  it('finds multiple items when we give it the right key', () => {
    const found = getQueryValues('?hello=world&parts=12345&parts=6789&what=you', 'parts');
    expect(found).toEqual(['12345', '6789']);
  });
});

describe('Query string number parsing tests', () => {
  it('handles empty query strings', () => {
    const found = getNumericQueryValues('', 'foo');
    expect(found).toEqual([]);
  });

  it('returns nothing when given a key that is not there', () => {
    const found = getNumericQueryValues('?hello=world&parts=12345', 'foo');
    expect(found).toEqual([]);
  });

  it('finds one item we give it a good key', () => {
    const found = getNumericQueryValues('?hello=world&parts=12345', 'parts');
    expect(found).toEqual([12345]);
  });

  it('finds multiple items when we give it the right key', () => {
    const found = getNumericQueryValues('?hello=world&parts=12345&parts=6789&what=you', 'parts');
    expect(found).toEqual([12345, 6789]);
  });
});

describe('Query time range tests', () => {
  it("sets end timestamp to midnight UTC of next day if it's already the next day in UTC", () => {
    const sampleNow = 1644980072000; // ~6pm PST
    const { to } = createQueryDateRange(
      {
        type: DateRangeType.FromToNow,
        unit: 'D',
        quantity: 7,
      },
      new Date(sampleNow),
    );
    expect(to).toEqual(1645055999999); // expect midnight 2/17 UTC
  });

  it('leaves a range alone if it is more than one day long', () => {
    const inputTo = new Date('2021-02-16T18:00:00.000Z');
    const inputFrom = new Date('2021-02-15T18:00:00.000Z');
    const { from, to } = ensureDateRangeIsAtLeastOneDay({ from: inputFrom.getTime(), to: inputTo.getTime() });
    expect(from).toEqual(inputFrom.getTime());
    expect(to).toEqual(inputTo.getTime());
  });

  it('sets end timestamp to one day forward if it is less than one day long', () => {
    const inputTo = new Date('2021-02-16T18:00:00.000Z');
    const inputFrom = new Date('2021-02-16T17:00:00.000Z');
    const { from, to } = ensureDateRangeIsAtLeastOneDay({ from: inputFrom.getTime(), to: inputTo.getTime() });
    expect(from).toEqual(inputFrom.getTime());
    expect(to).toEqual(new Date('2021-02-17T18:00:00.000Z').getTime());
  });
});

describe('createQueryDateRange tests', () => {
  it('creates the expected date range for a range in local time that changes days in UTC', () => {
    const inputStart = new Date('2021-02-16T22:00:00.000-04:00'); // 10pm EST -- this is the 17th in UTC
    const inputEnd = new Date('2021-02-18T22:00:00.000-04:00'); // 10pm EST
    const output = createQueryDateRange({ type: DateRangeType.DateToDate, from: inputStart, to: inputEnd });
    const expectedStart = new Date('2021-02-17T00:00:00.000Z').getTime(); // midnight UTC
    const expectedEnd = new Date('2021-02-19T23:59:59.999Z').getTime(); // midnight UTC minus one millisecond
    expect(output.from).toEqual(expectedStart);
    expect(output.to).toEqual(expectedEnd);
  });

  it('creates the expected date range for a range in local time that does not change days in UTC', () => {
    const inputStart = new Date('2023-06-08T00:00:00.000-07:00'); // midnight PT
    const inputEnd = new Date('2023-06-09T00:00:00.000-07:00'); // midnight PT
    const output = createQueryDateRange({ type: DateRangeType.DateToDate, from: inputStart, to: inputEnd });
    const expectedStart = new Date('2023-06-08T00:00:00.000Z').getTime(); // midnight UTC
    const expectedEnd = new Date('2023-06-09T23:59:59.999Z').getTime(); // midnight UTC minus one millisecond
    expect(output.from).toEqual(expectedStart);
    expect(output.to).toEqual(expectedEnd);
  });

  it('creates the expected date range for a FromToNow range in hours', () => {
    const inputStart = new Date('2021-02-16T22:00:00.000-04:00'); // 10pm EST -- this is the 17th in UTC
    const output = createQueryDateRange({ type: DateRangeType.FromToNow, quantity: 6, unit: 'H' }, inputStart); // override NOW
    const expectedStart = new Date(inputStart).setHours(inputStart.getHours() - 6, 0, 0, 0); // 6 hours ago
    const expectedEnd = new Date(inputStart).setHours(inputStart.getHours(), 59, 59, 999); // no time-shift on an hourly range
    expect(output.from).toEqual(expectedStart);
    expect(output.to).toEqual(expectedEnd);
  });

  it('creates the expected date range for a FromToNow range in days', () => {
    const inputStart = new Date('2021-02-16T22:00:00.000-04:00'); // 10pm EST -- this is the 17th in UTC
    const output = createQueryDateRange({ type: DateRangeType.FromToNow, quantity: 6, unit: 'D' }, inputStart); // override NOW
    const expectedStartDate = new Date(inputStart);
    expectedStartDate.setUTCDate(expectedStartDate.getUTCDate() - 6);
    expectedStartDate.setUTCHours(0, 0, 0, 0);
    const expectedEndDate = new Date(inputStart).setUTCHours(23, 59, 59, 999);
    expect(output.from).toEqual(expectedStartDate.getTime());
    expect(output.to).toEqual(expectedEndDate);
  });

  it('creates the expected date range for a FromToNow range in weeks', () => {
    const inputStart = new Date('2023-10-23T21:00:00.000-04:00'); // Monday, Oct 23, 2023 9pm EST -- this is the 24th in UTC
    const output = createQueryDateRange({ type: DateRangeType.FromToNow, quantity: 3, unit: 'W' }, inputStart); // override NOW
    const expectedStartDate = new Date('2023-10-01T00:00:00.000Z');
    const expectedEndDate = new Date('2023-10-28T23:59:59.999Z');
    expect(output.from).toEqual(expectedStartDate.getTime());
    expect(output.to).toEqual(expectedEndDate.getTime());
  });

  it('creates the expected date range for a FromToNow range in months with a time zone rollover', () => {
    const inputStart = new Date('2023-10-31T21:00:00.000-04:00'); // Tuesday, Oct 31, 2023 9pm EST -- this is November in UTC
    const output = createQueryDateRange({ type: DateRangeType.FromToNow, quantity: 2, unit: 'M' }, inputStart); // override NOW
    const expectedStartDate = new Date('2023-09-01T00:00:00.000Z');
    const expectedEndDate = new Date('2023-11-30T23:59:59.999Z');
    expect(output.from).toEqual(expectedStartDate.getTime());
    expect(output.to).toEqual(expectedEndDate.getTime());
  });
});
