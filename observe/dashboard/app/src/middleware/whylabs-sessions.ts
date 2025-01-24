import crypto from 'crypto';

import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-openid-connect';
import { Logger } from 'pino';
import { isEmpty } from 'ramda';
import userAgentParser from 'ua-parser-js';

import { USER_AGENT_HEADER_NAME, WHYLABS_SESSION_COOKIE_NAME } from '../constants';
import { getLogger } from '../providers/logger';
import { validateUserSession } from '../services/data/songbird/api-wrappers/security';
import { CallOptions } from '../util/async-helpers';

const logger = getLogger('WhyLabsSessionValidator');

type BrowserFingerprint = {
  hash: string; // hash of the entire UserAgent string + IP address
  ipAddress: string;
  parsedUA: userAgentParser.IResult;
};

// This removes the dynamic string -> any properties from Session
type KnownOIDCSession = Pick<Session, 'id_token' | 'access_token' | 'refresh_token' | 'token_type' | 'expires_at'>;

export type WhyLabsSession = {
  /**
   * Information about the user's machine and browser from when the session was initially established (during login)
   * Used to validate subsequent requests for any changes, so we can initiate a re-authentication flow if we suspect any shenanigans.
   */
  initialFingerprint: BrowserFingerprint;
  sessionId: string;
} & KnownOIDCSession;

/**
 * Generates a browser fingerprint for the incoming HTTP request
 * @param req
 */
export const getBrowserFingerprint = (req: Request): BrowserFingerprint => {
  const { ip } = req;
  const ua = req.header(USER_AGENT_HEADER_NAME) ?? '';
  const parsedUA = userAgentParser(ua);

  /**
   * Create a hash based on the user's User Agent info.
   * We don't yet take IP changes into account, as that may result in more frequent re-authentication than we want.
   * https://nodejs.org/api/crypto.html#class-hash
   */
  const hash = crypto.createHash('sha256').update(ua).digest('base64');
  return { hash, ipAddress: ip, parsedUA };
};

/**
 * Validates the session. Runs the callback if it encounters an invalid session. Returns validity status.
 * @param req
 * @param options
 */
export const validateSession = async (
  req: Request,
  options: { onInvalidSession: (req: Request) => void; sessionLogger: Logger },
): Promise<boolean> => {
  const { onInvalidSession, sessionLogger } = options;
  const cookie = req[WHYLABS_SESSION_COOKIE_NAME];

  // check if we already know the session is absent or invalid
  if (!cookie || isEmpty(cookie)) {
    // this needs to continue to allow the user to log in
    return true;
  }
  const { sessionId } = cookie;
  if (!sessionId) {
    onInvalidSession(req);
    return false;
  }
  const oidcUser = req.identity?.user;
  const user = { userId: oidcUser?.sub }; // log the user ID
  const callOptions: CallOptions = {
    context: {
      auth0UserId: oidcUser?.sub ?? 'unknown', // this call is on behalf of the impersonator not the impersonated user
      operationContext: { name: 'validateSession' },
    },
  };

  const userSessionValid = (await validateUserSession(sessionId ?? '', callOptions)).isValid;
  if (!userSessionValid) {
    sessionLogger.info({ user, sessionId }, 'Use of invalid/revoked session id detected. Destroying session.');
    onInvalidSession(req);
    return false;
  }

  const sessionValid = validateSessionFingerprint(req, sessionLogger) && userSessionValid;
  if (!sessionValid) {
    onInvalidSession(req);
  }

  return sessionValid;
};

export const validateSessionFingerprint = (req: Request, sessionLogger: Logger): boolean => {
  const { initialFingerprint } = req[WHYLABS_SESSION_COOKIE_NAME] ?? {};
  if (!initialFingerprint) {
    // we did not generate a fingerprint for this session, so there is nothing to check
    return true;
  }

  const currentFingerprint = getBrowserFingerprint(req);
  const fingerprintValid = currentFingerprint.hash === initialFingerprint.hash;

  if (!fingerprintValid) {
    sessionLogger.warn(
      { initialFingerprint, currentFingerprint },
      "Possible session hijack detected: request fingerprint doesn't match initial state. Destroying session.",
    );
  }

  return fingerprintValid;
};

/**
 * Invalidates the user session associated with the incoming request
 * @param req
 */
export const destroySession = (req: Request): void => {
  /**
   * For now, we just need to clear the session cookie.
   * This is essentially the same as `res.oidc.logout()`, except without the redirect to /login, which causes issues with Apollo client (it does not follow redirects)
   * Our front end will detect that the user no longer has a valid session and redirect them to /login.
   * If we switch to some other session store (not cookies), we'll need to invalidate the session there.
   */
  req[WHYLABS_SESSION_COOKIE_NAME] = undefined;
};

/**
 * Ensures that the WhyLabs user session is valid. Logs the user out if not.
 */
export const whyLabsSessionValidator =
  () =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await validateSession(req, { sessionLogger: logger, onInvalidSession: destroySession }))) {
        res.send();
        return;
      }
      next();
    } catch (err) {
      logger.error(err, "Something went wrong when validating the user's session, proceeding without validation");
      next();
    }
  };
