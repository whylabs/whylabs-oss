import { expect } from 'chai';

import { friendlyFormat } from './numbers';

describe('Testing the number formatting function', function () {
  const testValues = [
    { num: 1234, digits: 1, output: '1.2k' },
    { num: 100000000, digits: 1, output: '100M' },
    { num: 299792458, digits: 1, output: '299.8M' },
    { num: 759878, digits: 1, output: '759.9k' },
    { num: 759878, digits: 0, output: '760k' },
    { num: 123, digits: 1, output: '123' },
    { num: 123.456, digits: 1, output: '123.5' },
    { num: 123.456, digits: 2, output: '123.46' },
    { num: 123.456, digits: 4, output: '123.456' },
  ];
  const smallTestValues = [
    { num: 0, digits: 5, output: '0' },
    { num: 0.1234, digits: 1, output: '0.1' },
    { num: 0.0001234, digits: 2, output: '0.00012' },
    { num: -0.0001234, digits: 2, output: '-0.00012' },
    { num: 0.000001234, digits: 2, output: '1.23e-6' },
    { num: -0.000001234, digits: 3, output: '-1.234e-6' },
    { num: 0.0000000016, digits: 0, output: '2e-9' },
  ];
  const mediumTestValues = [
    { num: 12345.67, digits: 2, output: '12,345.67' },
    { num: 1001, digits: 0, output: '1,001' },
    { num: 1234567.89, digits: 2, output: '1.23M' },
  ];
  it('outputs expected values for large numbers including truncating thousands', function () {
    testValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits, { bypassSmall: false, bypassThousands: true })).to.equal(tv.output);
    });
  });
  it('outputs expected values for small numbers', function () {
    smallTestValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits)).to.equal(tv.output);
    });
  });
  it('can bypass the small number formatting rules', function () {
    expect(friendlyFormat(0.0000012, 2, { bypassSmall: true })).to.equal('0');
  });
  it('returns an empty string for invalid digit requests and NaN', function () {
    expect(friendlyFormat(Number.NaN, 3)).to.equal('');
    expect(friendlyFormat(1234567, -5)).to.equal('');
  });
  it('outputs expected values using thousands formatting', function () {
    mediumTestValues.forEach((tv) => {
      expect(friendlyFormat(tv.num, tv.digits)).to.equal(tv.output);
    });
  });
});
