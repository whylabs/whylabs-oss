import express from 'express';
import { Options, createProxyMiddleware } from 'http-proxy-middleware';

import { config, latestCommit, port, serviceUrl } from './config';
import routes from './controllers/routes';
import { prisma } from './orm/config/client';
import { parseSpans } from './orm/otel/SpanProcessor';
import { getLogger } from './providers/logger';
import { setupHeaders } from './startup/headers';
import { setupLogging } from './startup/logging';
import { setupPerformanceMiddleware } from './startup/performance';
import { setupSecurity } from './startup/security';
import { setupGracefulExits } from './startup/shutdown';
import { setupTelemetryMiddleware } from './startup/telemetry';
import { DashboardStartupOptions } from './startup/types';

const logger = getLogger('Main');

const initService = async (): Promise<void> => {
  const { stage, networking } = config;
  logger.info('Initializing service with config for %s environment, commit %s', stage, latestCommit);
  const app = express();
  app.disable('x-powered-by');

  // global middleware and config

  const startupOptions: DashboardStartupOptions = {
    port,
    serviceUrl,
  };

  /**
   * Dashbird is behind a load balancer, but we need the user's original IP address and other network information
   * By setting this value to 1, we trust at most 1 hop away from the application, meaning either socket address or the last entry
   * in the x-forwarded-for header, which should be set by our ALB
   * https://expressjs.com/en/guide/behind-proxies.html
   */
  app.set('trust proxy', 1);

  for (const middleware of [
    setupLogging,
    setupHeaders,
    setupSecurity,
    setupPerformanceMiddleware,
    setupTelemetryMiddleware,
  ]) {
    await middleware(app, logger, startupOptions);
  }

  app.post(
    '/v1/traces',
    express.raw({ type: 'application/x-protobuf', limit: '500kb' }), //
    async (req, res) => {
      try {
        // Ensure the request body is a Buffer
        if (!Buffer.isBuffer(req.body)) {
          res.status(400).json({ error: 'Invalid request body. Expected Protobuf data.' });
          return;
        }
        const entries = parseSpans(req.body);
        prisma.spanEntry
          .createMany({
            data: entries,
          })
          .then(() => {
            logger.warn('Saved ' + entries.length);
          })
          .catch((err: unknown) => {
            logger.error('Failed to save spans', err);
          });
        res.status(200).send();
      } catch (error) {
        console.log(error);
        res.status(400).send();
      }
    },
  );

  const options: Options = {
    // TODO: replace with actual guardrails endpoint
    target: process.env.WHYLABS_GUARDRAILS_ENDPOINT ?? 'http://172.179.48.104', // target host
    changeOrigin: true, // needed for virtual hosted sites
    pathRewrite: {
      '^/v1/secure/': '/', // remove /api prefix when forwarding
    },
    headers: {
      // TODO: api key for Hadron deployment? Static one
      'X-API-Key':
        process.env.WHYLABS_GUARDRAILS_ENDPOINT ?? 'wjYDn8K0jZRoWkuALgjr5TGuX/NaaWzSy7ntMxRsI6M+FwcEp9aNQcaEs/q9e5dn',
    },
    logger: logger,
    // You can add more options here as needed
  };

  // Create the proxy middleware
  const guardrails = createProxyMiddleware(options);
  app.use('/v1/secure', guardrails);

  // routes and error handlers
  routes(app);

  // start service
  const server = app.listen(Number(port), '0.0.0.0', () =>
    logger.info('Service is up on port %s, pid %s', port, process.pid),
  );

  server.keepAliveTimeout = networking.keepAliveTimeout;
  server.headersTimeout = networking.headersTimeout;

  // graceful exits
  setupGracefulExits(server, logger);
};

initService().catch((err) => {
  logger.fatal(err, 'Failed to start Dashboard service, exiting process!');
  // eslint-disable-next-line no-process-exit
  process.exit(1); // force quit to interrupt any async processes triggered by init process (eg cache)
});
