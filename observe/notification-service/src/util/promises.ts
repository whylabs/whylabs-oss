import { getLogger } from '../providers/logger';

const logger = getLogger('PromiseUtils');

/**
 * Executes a task with a timeout. Returns a rejected promise if timeout lapses.
 * @param promise Task to execute
 * @param msTimeout Time in milliseconds to wait for the task to execute
 */
export const runWithTimeout = async <T>(promise: Promise<T>, msTimeout: number): Promise<T> => {
  const promiseWithTimeout: Promise<never> = new Promise((_, reject) => {
    setTimeout(() => reject(`Failed to execute task: timeout exceeded (${msTimeout / 1000} sec)`), msTimeout);
  });
  return Promise.race([promise, promiseWithTimeout]);
};

/**
 * Runs tasks, returns true for each promise that successfully completed
 * and false for promises that reject.
 * Does not throw.
 * @param tasks Tasks to run
 */
export const tryRunTasks = (tasks: (() => Promise<void>)[]): Promise<boolean[]> =>
  Promise.all(
    tasks.map(async (task) => {
      try {
        await task();
        return true;
      } catch (err) {
        logger.error(err, 'Failed to execute task.');
        return false;
      }
    }),
  );

export const delay = async (msDelay: number): Promise<void> => {
  return new Promise((res) => {
    setTimeout(res, msDelay);
  });
};

export function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

export interface GroupedResults<T> {
  readonly fulfilled: PromiseFulfilledResult<T>[];
  readonly rejected: PromiseRejectedResult[];
}

export function groupByResult<T>(results: PromiseSettledResult<T>[]): GroupedResults<T> {
  const grouped: GroupedResults<T> = {
    fulfilled: [],
    rejected: [],
  };

  results.reduce((acc, cur) => {
    if (isFulfilled(cur)) {
      acc.fulfilled.push(cur);
    } else {
      acc.rejected.push(cur);
    }
    return acc;
  }, grouped);

  return grouped;
}
