import { Serializable } from 'child_process';

import pino from 'pino';
import { req, res } from 'pino-std-serializers';

import { config, isDebugMode, isLocalMode, latestCommit, serviceName } from '../config';
import { SensitiveErrorProps } from '../util/logging';

interface LoggerOptions {
  includeHeaders: boolean;
}

/* Object to always log. Contains metadata that is universally useful */
const defaultLogObject: { [key: string]: Serializable } = {
  environment: config.stage,
  region: config.region,
  commit: latestCommit,
  serviceName,
};

/**
 * Returns an instance of pino logger
 * @param loggerName Name for this logger instance. Will be included in the logs
 * @param opts Logger options
 * @param additionalProps Any additional properties to include
 */
export const getLogger = (
  loggerName: string,
  opts?: LoggerOptions,
  additionalProps?: { [key: string]: Serializable },
): pino.Logger =>
  pino({
    name: loggerName,
    level: isLocalMode() || isDebugMode() ? 'debug' : 'info',
    // add default serializer for Express response/request objects, so that only relevant properties are serialized
    serializers: { req, res },
    // if headers are included, still exclude cookies and other sensitive headers
    redact: opts?.includeHeaders
      ? [
          'req.headers.cookie',
          'res.headers.cookie',
          `req.headers["X-API-Key"]`,
          `req.headers["X-WHY-BYPASS-TOKEN"]`,
          `req.headers["x-api-key"]`,
          `req.headers["x-why-bypass-token"]`,
          ...SensitiveErrorProps,
        ]
      : ['req.headers', 'res.headers', ...SensitiveErrorProps],
    mixin: () => ({
      loggerName,
      ...defaultLogObject,
      ...additionalProps,
    }),
    formatters: {
      level: (level) => ({ level }),
    },
  });
