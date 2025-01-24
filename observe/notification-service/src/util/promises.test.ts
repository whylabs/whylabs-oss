import { runWithTimeout, tryRunTasks } from './promises';

const setupTimeoutTest = (resolveDuration: number, timeout: number): Promise<unknown> => {
  const mockPromise = new Promise((res) => setTimeout(() => res(null), resolveDuration));
  return runWithTimeout(mockPromise, timeout);
};

describe('runWithTimeout', () => {
  it('should resolve successfully if promise completes before timeout', async () => {
    await expect(setupTimeoutTest(10, 15 * 1000)).resolves.not.toThrow();
    expect.assertions(1);
  });
  it('should reject if promise does not complete before timeout', async () => {
    await expect(setupTimeoutTest(250, 1)).rejects.toMatch(/Timeout exceeded/i);
    expect.assertions(1);
  });
});

const setupTryRunTest = (promiseARejects: boolean, promiseBRejects: boolean): Promise<boolean[]> => {
  const promiseA: Promise<void> = new Promise((res, rej) => (promiseARejects ? rej() : res()));
  const promiseB: Promise<void> = new Promise((res, rej) => (promiseBRejects ? rej() : res()));
  return tryRunTasks([() => promiseA, () => promiseB]);
};

describe('tryRunTasks', () => {
  it('should run both promises if both resolve', async () => {
    await expect(setupTryRunTest(false, false)).resolves.toEqual([true, true]);
    expect.assertions(1);
  });
  it('should fail second promise if it rejects, but complete the first', async () => {
    await expect(setupTryRunTest(false, true)).resolves.toEqual([true, false]);
    expect.assertions(1);
  });
  it('should fail both promises if both reject', async () => {
    await expect(setupTryRunTest(true, true)).resolves.toEqual([false, false]);
    expect.assertions(1);
  });
});
