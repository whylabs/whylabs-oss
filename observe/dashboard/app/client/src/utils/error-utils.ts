import { TRPCError } from '@trpc/server';
import { DashbirdErrorCode, DashbirdError as DashbirdErrorExtensions } from '~server/graphql/generated/graphql';

export interface DashbirdError extends TRPCError {
  extensions: DashbirdErrorExtensions;
}

/**
 * Checks if the GraphQL error is of a known middle tier error type.
 * Note: GraphQL requests can return multiple GraphQL Errors. This function helps understand one of these error objects at a time.
 * DashbirdErrors contain a human readable message that is safe to expose to the user.
 */
export const isDashbirdError = (obj: unknown): obj is DashbirdError => {
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
