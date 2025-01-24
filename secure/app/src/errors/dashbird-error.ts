import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/src/rpc/codes';

import { DashbirdError, DashbirdErrorCode } from '../types/api';

export const extractDashbirdError = (err: unknown): DashbirdError | undefined => {
  if (err instanceof TRPCError && err.cause && 'code' in err.cause && 'safeErrorMsg' in err.cause) {
    return err.cause as DashbirdError;
  }
  return undefined;
};

export class PaginationLimitExceeded extends TRPCError {
  constructor() {
    const cause: DashbirdError = {
      code: DashbirdErrorCode.PaginationLimitExceeded,
      safeErrorMsg: 'Pagination limit exceeded',
    };
    super({ message: cause.safeErrorMsg, code: dashbirdErrorCodeToTrpc(cause.code), cause });
  }
}

export class ValidationError extends TRPCError {
  constructor(message: string) {
    const cause: DashbirdError = {
      code: DashbirdErrorCode.ValidationError,
      safeErrorMsg: message,
    };
    super({ message: cause.safeErrorMsg, code: dashbirdErrorCodeToTrpc(cause.code), cause });
  }
}

export class DataQueryValidationError extends TRPCError {
  constructor(messages: string[]) {
    const cause: DashbirdError = {
      code: DashbirdErrorCode.DataQueryValidationError,
      safeErrorMsg: messages.join('\n '),
    };
    super({ message: cause.safeErrorMsg, code: dashbirdErrorCodeToTrpc(cause.code), cause });
  }
}

export const errorCodeToLogLevel = (code: DashbirdErrorCode): 'error' | 'warn' => {
  if (
    [
      DashbirdErrorCode.MonitorConfigValidationError,
      DashbirdErrorCode.MonitorSchemaValidationError,
      DashbirdErrorCode.DataQueryValidationError,
      DashbirdErrorCode.QueryTooGranular,
      DashbirdErrorCode.AuthorizationError,
      DashbirdErrorCode.InvalidOrganization,
      DashbirdErrorCode.ArgumentValue,
      DashbirdErrorCode.IllegalArgument,
    ].includes(code)
  ) {
    return 'warn';
  }
  return 'error';
};

export const dashbirdErrorCodeToTrpc = (code: DashbirdErrorCode): TRPC_ERROR_CODE_KEY => {
  if (
    [
      DashbirdErrorCode.MonitorConfigValidationError,
      DashbirdErrorCode.MonitorSchemaValidationError,
      DashbirdErrorCode.DataQueryValidationError,
      DashbirdErrorCode.QueryTooGranular,
      DashbirdErrorCode.AuthorizationError,
      DashbirdErrorCode.InvalidOrganization,
      DashbirdErrorCode.ArgumentValue,
      DashbirdErrorCode.IllegalArgument,
    ].includes(code)
  ) {
    return 'BAD_REQUEST';
  }
  return 'INTERNAL_SERVER_ERROR';
};
