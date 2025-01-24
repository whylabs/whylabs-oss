import { Express } from 'express';

import { status, ready } from './health';

export default (app: Express): void => {
  app.use('/status', status);
  app.use('/health', ready);
};
