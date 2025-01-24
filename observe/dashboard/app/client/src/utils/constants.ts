const { protocol, host } = window.location;

const envMode = process.env.NODE_ENV;
export const IS_DEV_ENV = envMode === 'development';
export const IS_TEST_ENV = envMode === 'test';

export const isLocalhost = host.includes('localhost');

const localPort = process.env.NO_FRONT_END ? 3000 : 8080;
export const DASHBIRD_URI = isLocalhost ? `http://localhost:${localPort}` : `${protocol}//${host}`;
export const TABLE_HEADER_HEIGHT = 34;
