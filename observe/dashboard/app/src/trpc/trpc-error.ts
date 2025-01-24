import { ProcedureType, TRPCError } from '@trpc/server';
import { TRPC_ERROR_CODE_KEY } from '@trpc/server/src/rpc/codes';

import { errorCodeToLogLevel } from '../errors/dashbird-error';
import { DashbirdErrorCode } from '../graphql/generated/graphql';
import { getLogger } from '../providers/logger';
import { formatAxiosError, isAxiosError } from '../util/logging';
import { TrpcContext } from './trpc';

type Options = {
  ctx: TrpcContext | undefined;
  error: TRPCError;
  input: unknown;
  path: string | undefined;
  type: ProcedureType | 'unknown';
};
const logger = getLogger('TrcpErrorLogger');

const LOG_WARN_CODES: TRPC_ERROR_CODE_KEY[] = ['FORBIDDEN', 'UNAUTHORIZED'];
const LOG_INFO_CODES: TRPC_ERROR_CODE_KEY[] = ['NOT_FOUND'];

export const formatTrpcContext = (ctx: TrpcContext | undefined): string => {
  return ctx
    ? `auth0 user ${ctx.auth0UserId}, org ${ctx.targetOrgId}, whylabs user ${ctx.userMetadata?.userId}`
    : 'undefined';
};

const formatTrpcErrorSummary = (
  error: TRPCError,
  type: ProcedureType | 'unknown',
  path: string | undefined,
  ctx: TrpcContext | undefined,
): string => `TRPC error ${error.code}: ${error.message} in ${type} ${path} for ${formatTrpcContext(ctx)}`;

export const onTrpcError = (opts: Options): void => {
  const { error, type, path, input, ctx } = opts;
  let msg = '';
  let level: 'warn' | 'error' | 'info' = 'error';
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    // check if it is an axios error or a dashbird error, and render those instead
    const origError = error.cause;
    if (origError?.name === 'GraphQLError') {
      const dashbirdErr: { message: string; extensions?: { code: DashbirdErrorCode; safeErrorMsg: string } } =
        origError;
      if (dashbirdErr) {
        level = dashbirdErr.extensions?.code ? errorCodeToLogLevel(dashbirdErr.extensions?.code) : 'error';
        msg = `Dashbird Error: ${
          dashbirdErr.extensions?.safeErrorMsg ?? dashbirdErr.message
        } in ${type} ${path} for ${formatTrpcContext(ctx)}`;
      }
    } else if (isAxiosError(origError)) {
      msg = `Axios Error: ${formatAxiosError(origError)} in ${type} ${path} for ${formatTrpcContext(ctx)}`;
    }
  }
  if (!msg) {
    level = LOG_WARN_CODES.includes(error.code) ? 'warn' : LOG_INFO_CODES.includes(error.code) ? 'info' : 'error';
    msg = formatTrpcErrorSummary(error, type, path, ctx);
  }
  logger[level](msg);
  // put inputs out as debug unless it's an error
  if (input) {
    logger[level === 'error' ? 'error' : 'debug'](`TRPC error inputs: ${JSON.stringify(input)}`);
  }
};
