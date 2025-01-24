import { REQUEST_ID_HEADER_KEY } from '../constants';
import { DashboardStartupFunc } from './types';

export const setupHeaders: DashboardStartupFunc<void> = async (app, logger) => {
  // request id header
  logger.info('Setting up headers');
  app.use((req, res, next) => {
    res.header(REQUEST_ID_HEADER_KEY, req.id.toString());
    next();
  });
};
