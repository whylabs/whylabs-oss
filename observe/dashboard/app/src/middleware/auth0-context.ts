import { NextFunction, Request, RequestHandler, Response } from 'express';
import { OpenIDUser } from 'openid-client';

import { isDebugMode, isLocalMode, isProdMode } from '../config';
import {
  IDENTITY_REQUEST_KEY,
  OAUTH_TOKEN_REQUEST_KEY,
  WHYLABS_BYPASS_HEADER,
  WHYLABS_OIDC_APP_METADATA_KEY,
  WHYLABS_OIDC_CONN_NAME,
  WHYLABS_OIDC_CONN_STRATEGY,
  WHYLABS_OIDC_EMAIL_KEY,
  WHYLABS_OIDC_EMAIL_VERIFIED_KEY,
  WHYLABS_OIDC_ROLE_KEY,
  WHYLABS_OIDC_WHYLABS_ROLE_MAPPING,
} from '../constants';
import { authLogger } from '../graphql/authz/user-context';
import { Auth0ImpersonationMetadata, WhyLabsAdminRole, clearImpersonation } from '../services/security/auth0-wrapper';
import { SecretType, retrieveSecretManagerSecret } from '../services/security/secrets';
import { fnThrow } from '../util/misc';
import { isWhyLabsAdmin } from '../util/security-utils';

export type OAuthToken = {
  sub?: string;
  [WHYLABS_OIDC_EMAIL_KEY]?: string;
  [WHYLABS_OIDC_EMAIL_VERIFIED_KEY]?: boolean;
  [WHYLABS_OIDC_CONN_NAME]?: string;
  [WHYLABS_OIDC_CONN_STRATEGY]?: string;
  // ...and other props we don't care about here
};

const oAuthTokenToOIDCUser = (token?: OAuthToken): OpenIDUser | null => {
  if (!token) return null;

  return {
    sub: token.sub ?? fnThrow('Missing user ID in OAuth token'),
    email: token[WHYLABS_OIDC_EMAIL_KEY],
    email_verified: token[WHYLABS_OIDC_EMAIL_VERIFIED_KEY],
    // conn name and strategy are not available/relevant for a token, which we only use in testing
  };
};

const forbiddenResponse = (res: Response) => {
  res.status(403).send({ errors: [{ message: 'Unauthorized' }] });
};

/**
 * Bypass context is used locally for FE development directly against dashbird in dev.
 * @param req
 * @param res
 * @param next
 */
export const extractBypassContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const bypassHeader = req.header(WHYLABS_BYPASS_HEADER);
  if (!isProdMode() && bypassHeader) {
    const secret = await retrieveSecretManagerSecret(SecretType.Testing);
    if (secret && bypassHeader === secret.bypassKey) {
      authLogger.warn('Successfully bypassed authentication via a bypass header');
      const bypassAuth0User: OpenIDUser = {
        name: 'Bob Bobberson',
        email: 'bob@whylabs.ai',
        email_verified: true,
        sub: secret.bypassUserId,
      };
      req[IDENTITY_REQUEST_KEY] = { user: bypassAuth0User, source: 'bypass' };
      return next();
    } else {
      return forbiddenResponse(res);
    }
  } else {
    authLogger.error('Invalid attempt to use bypass header');
  }
  return forbiddenResponse(res);
};

/**
 * Debug production is used locally for debug against production backend
 * @param req
 * @param res
 * @param next
 */
export const extractDebugProdContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const debugUserId = process.env.DEBUG_USER_ID;
  const debugProdUser: OpenIDUser = {
    name: 'Debug Production',
    email: 'debug-prod@whylabs.ai',
    email_verified: true,
    sub: 'debug-prod', // this is not a valid user in auth0
    [WHYLABS_OIDC_ROLE_KEY]: [WhyLabsAdminRole],
    [WHYLABS_OIDC_APP_METADATA_KEY]: { impersonation: { userId: debugUserId, expiration: Date.now() + 60 * 1000 } },
  };
  req[IDENTITY_REQUEST_KEY] = { user: debugProdUser, source: 'debug' };
  return next();
};

/**
 * If Authorization header (bearer token) was set and is valid, we can use it here
 * This is not currently in use but could be used in integration tests
 * @param req
 * @param res
 * @param next
 */
export const extractAuthTokenContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const oAuthToken = req[OAUTH_TOKEN_REQUEST_KEY];
  const oAuthUser = oAuthTokenToOIDCUser(oAuthToken);
  if (oAuthUser && !isLocalMode()) {
    authLogger.error(
      `User ${oAuthUser.sub} attempted to log in via an access token. Token-based access is only supported locally.`,
    );
    return forbiddenResponse(res);
  }

  req[IDENTITY_REQUEST_KEY] = (oAuthUser && { user: oAuthUser, source: 'token' }) ?? undefined;
  next();
};

/**
 * Serves as a bridge between OpenID and Access Token-based auth flows by coercing user identities into a
 * single property on the Request object. Also handles bypass headers for dev testing.
 */
export const extractAuth0UserContext =
  (): RequestHandler =>
  async (req: Request, res, next): Promise<void> => {
    try {
      // Support dev bypass for testing purposes
      if (req.header(WHYLABS_BYPASS_HEADER)) {
        return extractBypassContext(req, res, next);
      }

      // Prod debug mode
      if (isDebugMode()) {
        return extractDebugProdContext(req, res, next);
      }

      // Auth token context
      const oAuthToken = req[OAUTH_TOKEN_REQUEST_KEY];
      if (oAuthToken) {
        return extractAuthTokenContext(req, res, next);
      }
      const oAuthUser = oAuthTokenToOIDCUser(oAuthToken);

      // OIDC context
      const oidcUser: OpenIDUser | undefined = req?.oidc?.idTokenClaims;
      // normalize the mappings which may be undefined, string or string[]
      if (oidcUser && typeof oidcUser[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING] === 'string') {
        oidcUser[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING] = [oidcUser[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING]];
      }
      if (oidcUser && oAuthUser) {
        authLogger.error(
          `Both OpenID and OAuth users were present in the same request: ${oidcUser.sub} and ${oAuthUser.sub} respectively. This should never happen, because only the implicit OR credentials-based login is possible at any given time.`,
        );
        return forbiddenResponse(res);
      }
      req[IDENTITY_REQUEST_KEY] = (oidcUser && { user: oidcUser, source: 'oidc' }) ?? undefined;
      next();
    } catch (err) {
      next(err);
    }
  };

export const extractAuth0ImpersonationContext =
  (): RequestHandler =>
  async (req: Request, res, next): Promise<void> => {
    try {
      // WhyLabs employee that is trying to impersonate another user, must be an oidc user and not bypass/token
      const realUser = req.identity?.user as OpenIDUser | undefined;
      if (!realUser || !['oidc', 'debug'].includes(req.identity?.source ?? '')) return next();
      const impersonation: Auth0ImpersonationMetadata | undefined =
        realUser[WHYLABS_OIDC_APP_METADATA_KEY]?.impersonation;
      // ensure we should even try to use impersonation context
      if (!impersonation || !impersonation.userId) {
        // expected for most requests, because the majority of requests will not attempt impersonation
        return next();
      }
      const { userId, expiration = 0 } = impersonation;

      // has impersonation expired?
      if (expiration <= Date.now()) {
        res.locals.impersonation = undefined; // should already be true but lets make sure
        // do not try to clear in Auth0 because that may overwrite a parallel impersonation update
        return next();
      }
      // ensure that the caller is actually allowed to impersonate other users
      if (!isWhyLabsAdmin(realUser)) {
        authLogger.error(
          `User ${realUser?.sub} attempted to impersonate user ${impersonation.userId}, but is not a WhyLabs Admin`,
        );
        await clearImpersonation(realUser.sub);
        return next();
      }
      res.locals.impersonation = { userId, expiration };
      return next();
    } catch (err) {
      next(err);
    }
  };
