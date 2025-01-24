import fs from 'fs';
import path from 'path';

import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express, { ErrorRequestHandler, Express, RequestHandler, Response } from 'express';

import { getLogger } from '../providers/logger';
import { appRouter } from '../trpc';
import { createContext } from '../trpc/trpc';
import { onTrpcError } from '../trpc/trpc-error';
import status from './status';

const logger = getLogger('RoutesLogger');

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

const loadIndexAndSetFixedVars = async (path: string): Promise<string | null> => {
  try {
    const content = await fs.promises.readFile(path, { encoding: 'utf-8' });

    return content;
  } catch (e) {
    logger.error(`Failed to read content: ${path}`, e);
    return null;
  }
};

let cachedIndexPage: string;

const PUBLIC_DIR = path.join(__dirname, '../public');

const initializeCachedIndex = async () => {
  if (!cachedIndexPage) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    // set vars that do not change between requests
    const fromFs = await loadIndexAndSetFixedVars(indexPath);
    if (!fromFs) {
      throw Error('Fatal: cannot load the main index.html');
    }
    cachedIndexPage = fromFs;
  }
};

const serveIndexHtml: RequestHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', -1);

  await initializeCachedIndex();

  const indexPageWithNonce = addCSPNonce(res, cachedIndexPage);

  res.send(indexPageWithNonce);
};

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

export default (app: Express): void => {
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

  app.get('*', serveIndexHtml);

  // custom handler for Auth0 rule failures
  app.use(defaultErrorHandler);
};
