import LogRocket from 'logrocket';

export function logOrThrowError(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    LogRocket.error(message);
    return '';
  }

  throw new Error(message);
}
