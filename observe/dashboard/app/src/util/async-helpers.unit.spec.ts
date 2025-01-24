import { expect } from 'chai';
import sinon from 'sinon';

import { processPromiseInChunks } from './async-helpers';

const mockData = [1, 2, 3, 4, 5];

describe('Testing processPromiseInChunks', function () {
  afterEach(function () {
    sinon.restore();
  });
  it('should call the promise.all 3 times with a 2 items chunk size when allow failures is false', async function () {
    const spyCallback = sinon.fake();
    const promiseAllMock = sinon.fake();
    sinon.replace(Promise, 'all', promiseAllMock);
    await processPromiseInChunks<number>(mockData, spyCallback, 2, false);
    expect(spyCallback.callCount).to.eql(5); // item resolver callback callCount
    expect(promiseAllMock.callCount).to.eql(3);
  });
  it('should call the promise.allSettled 2 times with a 3 items chunk size when allow failures is true', async function () {
    const spyCallback = sinon.fake();
    const promiseAllSettledMock = sinon.fake();
    sinon.replace(Promise, 'allSettled', promiseAllSettledMock);
    await processPromiseInChunks<number>(mockData, spyCallback, 3, true);
    expect(spyCallback.callCount).to.eql(5); // item resolver callback callCount
    expect(promiseAllSettledMock.callCount).to.eql(2);
  });
});
