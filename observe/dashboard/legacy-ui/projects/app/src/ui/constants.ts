export const GRAPH_WIDTH = 870;
export const GRAPH_HEIGHT = 160;
export const MIN_CAT_HEIGHT = 2;
export const LEGEND_HEIGHT = 30;

export const STANDARD_GRAPH_HORIZONTAL_BORDERS = 10;
export const FLEXIBLE_GRAPH_SVG_PADDING = 24;
export const FLEXIBLE_GRAPH_AREA_PADDING = 48;

export const TOTAL_GRAPH_AREA_WIDTH = 960;
export const TOTAL_GRAPH_AREA_HEIGHT = 220;
export const TOOLTIP_MIN_WIDTH = 64;

export const GRAPH_VERTICAL_BUFFER = 24;
export const GRAPH_HORIZONTAL_BUFFER = 48;

export const Y_RANGE_BUFFER_RATIO = 0.05;

export const TWENTY_THREE_HOURS_IN_MILLISECONDS = 1000 * 60 * 60 * 23;
export const FORTY_FIVE_MINUTES_IN_MILLISECONDS = 1000 * 60 * 45;

export const ONE_MINUTE_IN_MILLIS = 1000 * 60;
export const ONE_HOUR_IN_MILLIS = 60 * ONE_MINUTE_IN_MILLIS;
export const ONE_DAY_IN_MILLIS = 24 * ONE_HOUR_IN_MILLIS;
export const ONE_WEEK_IN_MILLIS = 7 * 24 * ONE_HOUR_IN_MILLIS;
export const ONE_MONTH_IN_MILLIS = 30 * 24 * ONE_HOUR_IN_MILLIS;
export const SIX_DAYS_IN_MILLISECONDS = 6 * ONE_DAY_IN_MILLIS;
export const TWENTY_SEVEN_DAYS_IN_MILLISECONDS = 27 * ONE_DAY_IN_MILLIS;

export const TRACING_CARD_HEADER_HEIGHT = '40px';
export const TRACING_CARD_CHART_BORDER = '1px solid';

const { protocol, host } = window.location;
export const DASHBIRD_URI = process.env.REACT_APP_DASHBOARD_URL ?? `${protocol}//${host}`;

/**
 * The following routes are used for authentication and must match Dashbird routing
 */

export const BASE_LOGIN_URI = 'login';
export const BASE_SIGNUP_URI = 'signup';
export const BASE_LOGOUT_URI = 'logout';
/**
 * Useful when we don't want to show the login screen to users again if they're already logged in.
 * E.g. when refreshing their login after email verification.
 * NOTE: this query param is interpreted by Dashbird, it is not an Auth0 thing:
 * https://gitlab.com/whylabs/dashboard-service/-/commit/bb149144118ab9a5c3f489dd4ffc6061c6969c0c
 */
export const SILENT_LOGIN_URI = `/${BASE_LOGIN_URI}?skip_prompt=true`;

export const FETCHING_ERROR_MESSAGE = 'An error occurred while fetching data';

export const TABS_HEIGHT = 44;
