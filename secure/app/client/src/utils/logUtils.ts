export function logOrThrowError(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    return '';
  }

  throw new Error(message);
}
