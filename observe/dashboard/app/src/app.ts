import express from 'express';

import { config, isDebugMode, latestCommit, port, serviceUrl } from './config';
import routes from './controllers/routes';
import { getLogger } from './providers/logger';
import { setupGraphQL } from './startup/graphql-server';
import { setupHeaders } from './startup/headers';
import { setupLogging } from './startup/logging';
import { setupPerformanceMiddleware } from './startup/performance';
import { setupSecurity } from './startup/security';
import { setupSessionMetadata } from './startup/session';
import { setupGracefulExits } from './startup/shutdown';
import { setupTelemetryMiddleware } from './startup/telemetry';
import { DashboardStartupOptions } from './startup/types';
import { ensureCanUseDebugMode } from './util/security-utils';

const logger = getLogger('Main');

const initService = async (): Promise<void> => {
  const { stage, networking } = config;
  logger.info('Initializing service with config for %s environment, commit %s', stage, latestCommit);
  const app = express();

  // global middleware and config
  const serveFrontEnd = !process.env.NO_FRONT_END;
  const startupOptions: DashboardStartupOptions = {
    port,
    serviceUrl,
    serveFrontEnd,
    frontEndUrl: serveFrontEnd ? serviceUrl : 'http://localhost:3000',
  };

  /**
   * Dashbird is behind a load balancer, but we need the user's original IP address and other network information
   * By setting this value to 1, we trust at most 1 hop away from the application, meaning either socket address or the last entry
   * in the x-forwarded-for header, which should be set by our ALB
   * https://expressjs.com/en/guide/behind-proxies.html
   */
  app.set('trust proxy', 1);

  // if we're in debug mode, ensure current user is allowed to access it
  if (isDebugMode()) {
    await ensureCanUseDebugMode();
  }

  for (const middleware of [
    setupLogging,
    setupHeaders,
    setupSecurity,
    setupPerformanceMiddleware,
    setupTelemetryMiddleware,
    setupSessionMetadata,
  ]) {
    await middleware(app, logger, startupOptions);
  }

  const apolloServer = await setupGraphQL(app, logger, startupOptions);

  // routes and error handlers
  routes(app, startupOptions);

  // start service
  const server = app.listen(port, () => logger.info('Service is up on port %s, pid %s', port, process.pid));

  server.keepAliveTimeout = networking.keepAliveTimeout;
  server.headersTimeout = networking.headersTimeout;

  // graceful exits
  setupGracefulExits(server, apolloServer, logger);
};

initService().catch((err) => {
  logger.fatal(err, 'Failed to start Dashboard service, exiting process!');
  // eslint-disable-next-line no-process-exit
  process.exit(1); // force quit to interrupt any async processes triggered by init process (eg cache)
});
