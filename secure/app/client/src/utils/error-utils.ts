import { TRPCError } from '@trpc/server';
import { DashbirdError as DashbirdErrorExtensions } from '~server/types/api';

interface DashbirdError extends TRPCError {
  extensions: DashbirdErrorExtensions;
}

/**
 * Extracts Dashbird errors with friendly messages/codes in them from TRPC errors.
 * @param err Ideally, an TRPC Error (caught when running queries or mutations)
 */
export const getDashbirdErrors = (err: unknown): DashbirdError[] => {
  // TODO: Implement this function for TRPC endpoint usage

  return [];
};
