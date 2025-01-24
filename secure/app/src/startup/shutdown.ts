import { Server } from 'http';
import v8 from 'v8';

import pino from 'pino';

import { isProdMode } from '../config';

/* eslint-disable no-process-exit */

/**
 * Adds listeners for interrupt signals and uncaught exceptions that will attempt to gracefully
 * shut down Express, Apollo, and/or other long-running processes before Dashbird is killed.
 * Also monitors memory usage and tries to keep the service from being killed by its parent cluster by gracefully terminating it and logging an error if it experiences unusual memory pressure.
 * @param server
 * @param logger
 */
export const setupGracefulExits = (server: Server, logger: pino.Logger): void => {
  const shutdown = async (defaultCode = 0): Promise<void> => {
    logger.warn('Received kill command, exiting');
    if (!isProdMode()) {
      logger.info('Running in development mode, killing app without waiting for connections to close');
      process.exit(defaultCode);
    }

    setTimeout(() => {
      logger.error('Failed to shut the server down within the time limit, forcefully killing it with great prejudice');
      process.exit(1);
    }, 15 * 1000);

    server.close((err) => {
      if (err) {
        logger.error(err, 'Encountered a problem shutting down Express.');
        process.exit(1);
      } else {
        logger.info('Successfully shut down Express.');
        process.exit(defaultCode);
      }
    });
  };

  const handleUncaughtException = (err: Record<string, unknown>): void => {
    logger.fatal(err, 'Encountered UNCAUGHT exception, exiting process!');

    // Note: MUST kill the service here, it is NOT safe to attempt recovery
    // https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
    process.exit(1);
  };

  // monitor this instance's memory usage and kill it before it goes OOM
  const UNSAFE_MEMORY_PERCENTAGE = 0.9;
  const BYTES_PER_MB = 1024 ** 2;

  const bytesToMB = (bytes: number): number => Math.round(bytes / BYTES_PER_MB);
  const maxMemory = v8.getHeapStatistics().heap_size_limit;
  const memoryThreshold = maxMemory * UNSAFE_MEMORY_PERCENTAGE;

  logger.info('Service will use a maximum of %sMB of RAM', bytesToMB(memoryThreshold));

  const checkMemoryUsage = async (): Promise<void> => {
    const currentlyUsedMemory = v8.getHeapStatistics().total_heap_size;

    if (currentlyUsedMemory > memoryThreshold) {
      logger.fatal(
        'Service is out of memory. Using %sMB of %sMB available RAM (%s%). Gracefully committing sudoku.',
        bytesToMB(currentlyUsedMemory),
        bytesToMB(maxMemory),
        Math.round((currentlyUsedMemory / maxMemory) * 100),
      );
      await shutdown(1);
    }
  };

  setInterval(checkMemoryUsage, 100);

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUncaughtException);
};
