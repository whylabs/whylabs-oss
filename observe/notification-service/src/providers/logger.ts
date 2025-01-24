import pino from 'pino';
import { Serializable } from 'child_process';
import { config } from '../config';

/* Object to always log. Contains metadata that is universally useful */
const defaultLogObject: { [key: string]: Serializable } = {
  environment: config.environment,
  region: config.region,
  commit: config.latestCommit ?? 'unknown',
};

/**
 * Returns an instance of pino logger
 * @param loggerName Name for this logger instance. Will be included in the logs
 * @param additionalProps Any additional properties to include
 */
export const getLogger = (loggerName: string, additionalProps?: { [key: string]: Serializable }): pino.Logger =>
  pino({
    mixin: () => ({
      loggerName,
      ...defaultLogObject,
      ...additionalProps,
    }),
  });
