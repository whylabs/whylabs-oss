import { IDENTITY_REQUEST_KEY, WHYLABS_SESSION_COOKIE_NAME } from '../constants';
import { WhyLabsSession } from '../middleware/whylabs-sessions';

declare module 'express' {
  interface Request {
    [IDENTITY_REQUEST_KEY]?: OIDCIdentity;
    [WHYLABS_SESSION_COOKIE_NAME]?: WhyLabsSession; // User's session, currently managed by express-openid-connect and stored in a cookie
    body: Record<string, unknown>;
  }

  interface Response {
    locals: {
      cspNonce?: string;
    };
  }
}
