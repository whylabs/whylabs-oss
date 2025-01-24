import { GraphQLError } from 'graphql';

import { DashbirdError, DashbirdErrorCode, MembershipRole, Permission } from '../graphql/generated/graphql';

/*
 * This file contains specialized GraphQL errors surfaced in the GraphQL stack, mainly in the resolvers.
 * The graphql calling UI (ui-exp) knows how to handle these errors and display them to the user.
 * Do not use these errors in the data sources that are shared with the TRPC stack. Instead, use the errors
 * in services/errors and use wrapKnownErrorAsGraphql in the resolvers to convert them to these errors.
 */
export const extractDashbirdError = (err: unknown): DashbirdError | undefined => {
  if (err instanceof GraphQLError && err.extensions.safeErrorMsg && err.extensions.code) {
    return err.extensions as DashbirdError;
  }
  return undefined;
};

export class GenericDashbirdError extends GraphQLError {
  constructor(
    message = 'Something went wrong, please try again later',
    code = DashbirdErrorCode.GenericError,
    parameter?: string,
  ) {
    const extensions: DashbirdError = {
      code,
      safeErrorMsg: message,
      parameter,
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class PaginationLimitExceeded extends GraphQLError {
  constructor() {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.PaginationLimitExceeded,
      safeErrorMsg: 'Pagination limit exceeded',
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.ValidationError,
      safeErrorMsg: message,
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

// this error should be moved into the service layer
export class AdhocMonitorRunError extends GraphQLError {
  constructor(message?: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.AdhocMonitorRunError,
      safeErrorMsg: message
        ? message
        : 'Something went wrong when running the monitor preview. Please try again later.',
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class BackfillAnalyzersError extends GraphQLError {
  constructor(message?: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.BackfillAnalyzersError,
      safeErrorMsg: message
        ? message
        : 'Something went wrong when running the backfill request. Please try again later.',
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class DataQueryValidationError extends GraphQLError {
  constructor(messages: string[]) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.DataQueryValidationError,
      safeErrorMsg: messages.join('\n '),
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class AuthorizationError extends GraphQLError {
  constructor(role: MembershipRole, requiredPermissions: Permission[], requestId: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.AuthorizationError,
      safeErrorMsg: `Unauthorized: ${role} does not have the required permissions '${requiredPermissions.join(
        ', ',
      )}'. RequestID: ${requestId}`,
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class ForbiddenError extends GraphQLError {
  // use AuthorizationError for normal RBAC issues.
  constructor(message?: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.AuthorizationError,
      safeErrorMsg: message ?? `Forbidden: You do not have permission to access this resource.`,
    };
    super(extensions.safeErrorMsg, { extensions });
  }
}

export class InvalidOrganizationError extends GraphQLError {
  constructor(orgId: string) {
    const extensions: DashbirdError = {
      code: DashbirdErrorCode.InvalidOrganization,
      safeErrorMsg: `Unauthorized: organization ${orgId} does not exist or you do not have permission to access it.`,
    };
    super(extensions.safeErrorMsg, { extensions });
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
