export type EnvironmentType = 'local' | 'dev' | 'prod' | 'unknown';

export function useEnvironment(): EnvironmentType {
  const host = window.location.hostname;
  if (host === 'localhost') {
    return 'local';
  }
  if (host.includes('observatory.development')) {
    return 'dev';
  }
  if (host.includes('hub.whylabsapp')) {
    return 'prod';
  }
  return 'unknown';
}
