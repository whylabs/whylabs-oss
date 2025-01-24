import { IDENTITY_REQUEST_KEY, OAUTH_TOKEN_REQUEST_KEY, WHYLABS_SESSION_COOKIE_NAME } from '../constants';
import { ValidatedImpersonationMetadata } from '../graphql/authz/impersonation-context';
import { OIDCIdentity } from '../graphql/authz/user-context';
import { OAuthToken } from '../middleware/auth0-context';
import { WhyLabsSession } from '../middleware/whylabs-sessions';

// TODO: improve express type overrides to allow inferred types (eg in routes) to inherit from this module as well
declare module 'express' {
  interface Request {
    [OAUTH_TOKEN_REQUEST_KEY]?: OAuthToken;
    [IDENTITY_REQUEST_KEY]?: OIDCIdentity;
    [WHYLABS_SESSION_COOKIE_NAME]?: WhyLabsSession; // User's session, currently managed by express-openid-connect and stored in a cookie
    body: {
      operationName?: string | null; // populated by Apollo Server for GraphQL queries that specify an operation name. Useful for metrics.
    } & Record<string, unknown>;
  }

  interface Response {
    locals: {
      cspNonce?: string;
      impersonation?: ValidatedImpersonationMetadata;
    };
  }
}
