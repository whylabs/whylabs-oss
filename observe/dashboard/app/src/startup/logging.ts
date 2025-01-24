import pinoExpress from 'express-pino-logger';
import { v4 as uuidv4 } from 'uuid';

import { isDebugMode, isLocalMode } from '../config';
import { DashboardStartupFunc } from './types';

export const setupLogging: DashboardStartupFunc<void> = async (app, logger) => {
  logger.info('Setting up request logging');
  // TODO: re-enable logging of specific headers that we are interested in
  const expressLogger = pinoExpress({
    redact: ['req.headers', 'res.headers'],
    autoLogging: isLocalMode() || isDebugMode(), // create request completed/errors log statements only when running locally
    genReqId: () => uuidv4(),
  });
  app.use(expressLogger);
};
