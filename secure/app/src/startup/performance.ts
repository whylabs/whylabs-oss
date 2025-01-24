import compression from 'compression';

import { DashboardStartupFunc } from './types';

declare module 'http' {
  export interface IncomingMessage {
    baseUrl?: string;
  }
}

export const setupPerformanceMiddleware: DashboardStartupFunc<void> = async (app) => {
  app.use(compression());
};
