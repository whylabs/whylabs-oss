import { DashbirdError as DashbirdErrorExtensions, DashbirdErrorCode } from 'generated/graphql';
import { GraphQLError } from 'graphql';
import { ApolloError, ServerError } from '@apollo/client';

export interface DashbirdError extends GraphQLError {
  extensions: DashbirdErrorExtensions;
}

/**
 * Checks if the GraphQL error is of a known middle tier error type.
 * Note: GraphQL requests can return multiple GraphQL Errors. This function helps understand one of these error objects at a time.
 * DashbirdErrors contain a human readable message that is safe to expose to the user.
 */
export const isDashbirdError = (obj: GraphQLError): obj is DashbirdError => {
  const maybeDashbirdError = obj as DashbirdError | undefined | null;
  return !!(
    maybeDashbirdError &&
    // Check if the error extensions property exists
    maybeDashbirdError.extensions &&
    // Check if the extensions field contains the "code" property
    'code' in maybeDashbirdError.extensions &&
    // Check if the code property is a known dashbird error code
    Object.values(DashbirdErrorCode).includes(maybeDashbirdError.extensions.code)
  );
};

const isApolloError = (err: unknown): err is ApolloError => {
  const maybeApolloError = err as ApolloError;
  return (
    maybeApolloError &&
    (!!maybeApolloError.graphQLErrors || !!maybeApolloError.clientErrors || !!maybeApolloError.networkError)
  );
};

/**
 * Apollo network errors can be of multiple possible types. We are only interested in the ServerError variety,
 * which may contain Dashbird error codes
 * @param err
 */
const isServerError = (err: ApolloError['networkError']): err is ServerError => {
  const maybeError = err as ServerError | null;
  return !!maybeError && !!maybeError.statusCode && !!maybeError.result;
};

/**
 * Extracts Dashbird errors with friendly messages/codes in them from Apollo errors.
 * @param err Ideally, an Apollo Error (caught when running queries or mutations)
 */
export const getDashbirdErrors = (err: unknown): DashbirdError[] => {
  if (isApolloError(err)) {
    // GraphQL errors are returned when the operation reached the server, was processed, but something went wrong during execution.
    const gqlErrors = err.graphQLErrors.filter(isDashbirdError);

    if (!isServerError(err.networkError)) {
      return gqlErrors;
    }

    /**
     * Network errors are returned when the operation was not processed by Apollo server, because it is unreachable or
     * because the failure occurred before getting to GraphQL resolvers.
     */
    const networkErrors: DashbirdError[] = (err.networkError.result.errors ?? []).filter(isDashbirdError);

    // return Dashbird errors from both GQL errors and network errors arrays, if any
    return gqlErrors.concat(networkErrors);
  }

  return [];
};
