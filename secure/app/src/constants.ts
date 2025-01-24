// Auth
export const BASE_LOGIN_URI = 'login';
export const BASE_LOGOUT_URI = 'logout';
/**
 * Useful when we don't want to show the login screen to users again if they're already logged in.
 * E.g. when refreshing their login after email verification.
 * NOTE: this query param is interpreted by Dashbird, it is not an Auth0 thing:
 * https://gitlab.com/whylabs/dashboard-service/-/commit/bb149144118ab9a5c3f489dd4ffc6061c6969c0c
 */
export const SILENT_LOGIN_URI = `${BASE_LOGIN_URI}?skip_prompt=true`;

// tracing
export const REQUEST_ID_HEADER_KEY = 'X-Request-ID';

// identity/auth/security
export const IDENTITY_REQUEST_KEY = 'identity'; // property on the Request object, where the caller's Auth0 user identity is stored
export const WHYLABS_SESSION_COOKIE_NAME = 'whylabsSession';
export const WHYLABS_USER_IP_HEADER = 'X-WHYLABS-USER-IP';
export const WHYLABS_USER_ID_HEADER = 'X-WHYLABS-ID';

// time
export const MILLIS_PER_HOUR = 60 * 60 * 1000;
export const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;
export const MAX_DAYS_PER_MONTH = 31;
