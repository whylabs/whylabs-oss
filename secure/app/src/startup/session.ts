import session from 'cookie-session';
import Keygrip from 'keygrip';

import { DashboardStartupFunc } from './types';

const SESSION_COOKIE_KEYS = new Keygrip(['signingkey', 'key1', 'key2', 'key3']);

export const setupSessionMetadata: DashboardStartupFunc<void> = async (app, logger) => {
  logger.info('Setting up session metadata');
  // session middleware for trpc and graphql
  app.use(
    ['/api'],
    session({
      keys: SESSION_COOKIE_KEYS,
      name: 'whylabs.session',
      maxAge: 60 * 1000, // 1 minute
      sameSite: 'strict',
    }),
  );
};
