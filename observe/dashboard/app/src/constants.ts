// Auth
export const BASE_LOGIN_URI = 'login';
export const BASE_SIGNUP_URI = 'signup';
export const BASE_LOGOUT_URI = 'logout';
/**
 * Useful when we don't want to show the login screen to users again if they're already logged in.
 * E.g. when refreshing their login after email verification.
 * NOTE: this query param is interpreted by Dashbird, it is not an Auth0 thing:
 * https://gitlab.com/whylabs/dashboard-service/-/commit/bb149144118ab9a5c3f489dd4ffc6061c6969c0c
 */
export const SILENT_LOGIN_URI = `${BASE_LOGIN_URI}?skip_prompt=true`;

export const DEMO_GLOBAL_ORG_ID = 'demo';

// tracing
export const REQUEST_ID_HEADER_KEY = 'X-Request-ID';

// identity/auth/security
export const WHYLABS_ORG_ID = 'org-0';
export const WHYLABS_OIDC_APP_METADATA_KEY = 'https://whylabs.ai/app_metadata';
export const WHYLABS_OIDC_ROLE_KEY = 'https://whylabs.ai/roles';
export const WHYLABS_OIDC_WHYLABS_ROLE_MAPPING = 'https://whylabs.ai/whylabs_role_mappings';
export const WHYLABS_OIDC_CONN_NAME = 'https://whylabs.ai/conn_name';
export const WHYLABS_OIDC_CONN_STRATEGY = 'https://whylabs.ai/conn_strategy';
export const WHYLABS_OIDC_EMAIL_KEY = 'https://whylabs.ai/email';
export const WHYLABS_OIDC_EMAIL_VERIFIED_KEY = 'https://whylabs.ai/email_verified';
export const OAUTH_TOKEN_REQUEST_KEY = 'token'; // property on the Request object, where the decoded OAuth tokens are stored
export const IDENTITY_REQUEST_KEY = 'identity'; // property on the Request object, where the caller's Auth0 user identity is stored
export const TARGET_ORG_HEADER_NAME = 'x-target-whylabs-org'; // header that sets the org context for the incoming request
export const AWS_MARKETPLACE_HEADER_TOKEN_NAME = 'x-amzn-marketplace-token';
export const SESSION_TOKEN_QUERY = 'sessionToken';
export const WHYLABS_SESSION_COOKIE_NAME = 'whylabsSession';
export const USER_AGENT_HEADER_NAME = 'user-agent';
export const WHYLABS_USER_IP_HEADER = 'X-WHYLABS-USER-IP';
export const WHYLABS_USER_ID_HEADER = 'X-WHYLABS-ID';
export const WHYLABS_ORG_HEADER = 'X-WHYLABS-ORGANIZATION';
export const WHYLABS_IMPERSONATOR_HEADER = 'X-WHYLABS-IMPERSONATOR';
export const WHYLABS_BYPASS_HEADER = 'X-WHY-BYPASS-TOKEN';

// misc
export const UNKNOWN_METADATA_VALUE = 'Unknown';

// baseline
export const YEARS_FOR_BASELINE_LOOKUP = 10; // number of years to look forward and back in Druid when searching for baseline data
export const YEARS_FOR_SEGMENT_LOOKUP = 10; // number of years to look forward and back in Druid when searching for segment data
export const DAYS_FOR_BASELINE = 7; // number of days to use to compute baseline for a dataset

// performance/scaling
export const DATA_SOURCE_BATCH_WINDOW_MS = 50; // millis to wait before sending off batched requests
export const PAGINATION_MAX_LIMIT = 1_000; // this is basically a random number. TODO: figure out an appropriate max limit
export const MAX_DB_ITEMS_PER_QUERY = 100_000; // global limit on the number of items Dashbird should try to fetch from any source
export const MAX_POSTGRES_DB_ITEMS = 10_000; // max global limit supported by postgres

// time
export const MILLIS_PER_HOUR = 60 * 60 * 1000;
export const DAYS_PER_YEAR = 365.25;
export const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;
export const MILLIS_PER_WEEK = 7 * MILLIS_PER_DAY;
export const MILLIS_PER_YEAR = MILLIS_PER_DAY * DAYS_PER_YEAR;
export const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;
export const MAX_DAYS_PER_MONTH = 31;

export const PERFORMANCE_TAG = 'performance';
export const SECURITY_TAG = 'security';
export const QUALITY_TAG = 'quality';
