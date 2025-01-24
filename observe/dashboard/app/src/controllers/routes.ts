import fs from 'fs';
import path from 'path';

import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express, { ErrorRequestHandler, Express, RequestHandler, Response } from 'express';

import { config } from '../config';
import { DEMO_GLOBAL_ORG_ID } from '../constants';
import { DEMO_ORG_ID } from '../graphql/authz/user-context';
import { handleAuth0RuleErrors } from '../middleware/auth0-rule-error-logger';
import { getLogger } from '../providers/logger';
import { DashboardStartupOptions } from '../startup/types';
import { appRouter } from '../trpc';
import { createContext } from '../trpc/trpc';
import { onTrpcError } from '../trpc/trpc-error';
import status from './status';

const logger = getLogger('RoutesLogger');

const { googleAppId, heapAppId } = config.analytics;

type ReplaceableClientVars = { name: string; value: string };

/**
 * Adds CSP nonce to an HTML doc
 * @param res Express response (should contain CSP nonce in Locals)
 * @param originalContent Original body of the page
 */
const addCSPNonce = (res: Response, originalContent: string): string => {
  if (!res.locals.cspNonce) {
    logger.error('No CSP nonce set in response, returning unmodified resource.');
    return originalContent;
  }
  return (
    originalContent
      // add nonce to all <script> elements
      .replace(/<script/g, `<script nonce="${res.locals.cspNonce}"`)
      // add nonce to all <style> elements
      .replace(/<style/g, `<style nonce="${res.locals.cspNonce}"`)
      // JSS (material-ui) and our own front end hooks look for the CSP nonce in a special meta tag:
      // https://github.com/cssinjs/jss/blob/master/docs/csp.md
      .replace('__JSS_CSP_NONCE__', res.locals.cspNonce)
  );
};

const loadIndexAndSetFixedVars = async (
  path: string,
  varsToReplace: ReplaceableClientVars[],
): Promise<string | null> => {
  try {
    let content = await fs.promises.readFile(path, { encoding: 'utf-8' });
    for (const variable of varsToReplace) {
      content = content.split(variable.name).join(variable.value);
    }
    return content;
  } catch (e) {
    logger.error(`Failed to read content: ${path}`, e);
    return null;
  }
};

let cachedIndexPage: string;
let cachedV2IndexPage: string;

const PUBLIC_DIR = path.join(__dirname, '../public');

// all v2 route starts with the org ID or the assets
const V2_ASSETS = '/v2/';
const V2_ROUTES = ['/org-'];
const ANALYTICS_IDS = [
  { name: '__HEAP_APP_ID__', value: heapAppId },
  { name: '__GOOGLE_ANALYTICS_ID__', value: googleAppId },
];

const initializeCachedIndex = async () => {
  if (!cachedIndexPage) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    // set vars that do not change between requests
    const fromFs = await loadIndexAndSetFixedVars(indexPath, ANALYTICS_IDS);
    if (!fromFs) {
      throw Error('Fatal: cannot load the main index.html');
    }
    cachedIndexPage = fromFs;
  }
  if (!cachedV2IndexPage) {
    const indexPath = path.join(PUBLIC_DIR, 'v2/index.html');

    // set vars that do not change between requests. Gracefully fails if the file doesn't exist
    cachedV2IndexPage = (await loadIndexAndSetFixedVars(indexPath, ANALYTICS_IDS)) ?? '';
  }
};

const serveIndexHtml: RequestHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', -1);

  if (req.baseUrl.startsWith(V2_ASSETS)) {
    return;
  }

  // Redirect using correct demo orgId when accessing with the global 'demo' string
  const globalDemoOrgPath = `/${DEMO_GLOBAL_ORG_ID}`;
  if (req.baseUrl.startsWith(globalDemoOrgPath)) {
    if (DEMO_ORG_ID) {
      res.redirect(req.originalUrl.replace(globalDemoOrgPath, `/${DEMO_ORG_ID}`));
    } else {
      logger.warn('Attempted to log in to the demo org, but it is not configured in the current environment.');
    }
    return;
  }

  await initializeCachedIndex();

  const isV2Route = V2_ROUTES.filter((route) => req.baseUrl.startsWith(route)).length > 0;
  const content = isV2Route ? cachedV2IndexPage : cachedIndexPage;
  const indexPageWithNonce = addCSPNonce(res, content);

  res.send(indexPageWithNonce);
};

const isV2AssetRoute = (url: string) =>
  url.startsWith(V2_ASSETS) || V2_ROUTES.filter((route) => url.startsWith(route)).length > 0;

const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err?.type === 'stream.not.readable') {
    // client interrupted, happens in some circumstances like logout
    logger.info(err.message);
  } else {
    logger.error(err);
  }

  return res.status(500).send(`An unexpected error occurred, please try again`);
};

export default (app: Express, opts: DashboardStartupOptions): void => {
  app.use('/status', status());
  app.use(
    '/api',
    express.json(),
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: onTrpcError,
    }),
  );

  // always serve static assets
  app.use(express.static(PUBLIC_DIR, { index: false }));

  if (opts.serveFrontEnd) {
    app.use('*', serveIndexHtml);
  } else {
    // local react use case
    app.use('*', async (req, res, next) => {
      if (isV2AssetRoute(req.baseUrl)) {
        await serveIndexHtml(req, res, next);
      } else {
        res.redirect(`http://localhost:3000${req.originalUrl}`);
      }
    });
    return;
  }

  // custom handler for Auth0 rule failures
  app.use(handleAuth0RuleErrors());
  app.use(defaultErrorHandler);
};
