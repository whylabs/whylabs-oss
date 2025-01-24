import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { createLatencyText } from './latency-utils';

chai.use(chaiAsPromised);

describe('createLatencyText', function () {
  it('should return a dash for null or undefined', async function () {
    expect(createLatencyText(null)).to.equal('-');
    expect(createLatencyText(undefined)).to.equal('-');
  });

  it('should format as ms when below 1 second', function () {
    expect(createLatencyText(999)).to.equal('999 ms');
    expect(createLatencyText(368.58986013980615)).to.equal('369 ms');
    expect(createLatencyText(900.4999)).to.equal('900 ms');
    expect(createLatencyText(900.5999)).to.equal('901 ms');
  });

  it('should include seconds', function () {
    expect(createLatencyText(1000)).to.equal('1,000 ms (1 s)');
    expect(createLatencyText(1500)).to.equal('1,500 ms (1.5 s)');
    expect(createLatencyText(5559)).to.equal('5,559 ms (5.56 s)');
    expect(createLatencyText(10000)).to.equal('10,000 ms (10 s)');
    expect(createLatencyText(59999)).to.equal('59,999 ms (60 s)');
  });

  it('should format large numbers of milliseconds correctly', function () {
    expect(createLatencyText(123456789)).to.equal('123.46M ms (123.46k s)');
  });
});
