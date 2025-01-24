import { ApolloError } from '@apollo/client';

export function logOrThrowError(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    return '';
  }

  throw new Error(message);
}

type ErrorTuple = [message: string, error: ApolloError | undefined];

function logErrorIfDefined([message, error]: ErrorTuple): void {
  if (error) {
    console.error(message, error);
  }
}

export function logErrorsIfDefined(...errors: readonly ErrorTuple[]): void {
  errors.forEach(logErrorIfDefined);
}
