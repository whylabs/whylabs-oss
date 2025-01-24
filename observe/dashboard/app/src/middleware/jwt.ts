import { RequestHandler } from 'express';
import { GetVerificationKey, expressjwt as jwt } from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';

import { isDebugMode, isLocalMode, serviceUrl } from '../config';
import { OAUTH_TOKEN_REQUEST_KEY } from '../constants';

/**
 * Decode and validate Auth0 access tokens
 * https://auth0.com/docs/quickstart/backend/nodejs#configure-auth0-apis
 */
export const checkJwt = (auth0LoginDomain: string): RequestHandler =>
  jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${auth0LoginDomain}/.well-known/jwks.json`,
    }) as GetVerificationKey, // Necessary type cast: https://github.com/auth0/express-jwt/issues/288#issuecomment-1122524366

    // not required by default, since this is an optional flow for Dashbird
    credentialsRequired: false,

    // key to use to store decoded token on Request objects
    requestProperty: OAUTH_TOKEN_REQUEST_KEY,

    // Validate the token audience and issuer if running in deployed mode
    audience: isLocalMode() || isDebugMode() ? undefined : serviceUrl,
    issuer: [`https://${auth0LoginDomain}/`],
    algorithms: ['RS256'],
  });
