import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { createLatencyText } from './latency-utils';

chai.use(chaiAsPromised);

describe('createLatencyText', function () {
  it('should return a dash for null or undefined', async function () {
    expect(createLatencyText(null)).to.equal('-');
    expect(createLatencyText(undefined)).to.equal('-');
  });

  it('should format as ms', function () {
    expect(createLatencyText(999)).to.equal('999 ms');
    expect(createLatencyText(368.58986013980615)).to.equal('369 ms');
    expect(createLatencyText(900.4999)).to.equal('900 ms');
    expect(createLatencyText(900.5999)).to.equal('901 ms');
  });

  it('should format as sec', function () {
    expect(createLatencyText(1000)).to.equal('1 sec');
    expect(createLatencyText(59999)).to.equal('60 sec');
  });

  it('should format as min', function () {
    expect(createLatencyText(60000)).to.equal('1 min');
    expect(createLatencyText(3599999)).to.equal('60 min');
  });

  it('should format as hr', function () {
    expect(createLatencyText(3600000)).to.equal('1 hr');
    expect(createLatencyText(10000000)).to.equal('2.78 hr');
  });

  it('should format as days', function () {
    expect(createLatencyText(86400000)).to.equal('1 days');
    expect(createLatencyText(1000000000)).to.equal('11.57 days');
  });
});
