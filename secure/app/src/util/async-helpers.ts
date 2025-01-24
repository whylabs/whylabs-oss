import { AxiosError } from 'axios';
import { isNetworkError } from 'axios-retry';
import { LevelWithSilent } from 'pino';

import { WHYLABS_USER_ID_HEADER, WHYLABS_USER_IP_HEADER } from '../constants';
import { errorCodeToLogLevel, extractDashbirdError } from '../errors/dashbird-error';
import { getLogger } from '../providers/logger';
import { mapDataServiceQueryError } from '../services/errors/error-wrapper';
import { ServiceError } from '../services/errors/service-errors';
import { formatAxiosError, isAxiosError } from './logging';
import { describeOperationContext, OperationContext } from './misc';
import { getRandomNumber } from './random';

const logger = getLogger('AsyncUtils');

export const sleepAsync = async (milliseconds: number): Promise<void> =>
  new Promise((r) => setTimeout(r, milliseconds));

const retryableAxiosCodes = new Set([408, 502, 503, 504]);

export const shouldRetryAxiosReq = (err: AxiosError): boolean => {
  const statusCode = err.response?.status;
  const hasStatus = !!statusCode;
  return isNetworkError(err) || (hasStatus && retryableAxiosCodes.has(statusCode));
};

/**
 * tryExecute differs from tryCall in its signature, which allows for returning null on a 404; and in taking
 * WhylabsCallContext rather than CallOptions
 * Use tryCall directly if ignoring 404s is not the desired behavior.
 * @param asyncCall
 * @param retry
 * @param failOnNotFound
 * @param errorMapper
 * @param context
 */

export const tryExecute = async <T>(
  asyncCall: () => Promise<{ data?: T }>,
  retry = true,
  failOnNotFound = false,
  errorMapper?: (err: AxiosError) => Error,
  context?: WhyLabsCallContext,
): Promise<T | null> => {
  const maybeOptions = context
    ? {
        ...defaultCallOptions,
        numRetries: retry ? defaultCallOptions.numRetries : 0,
        errorMapper,
        context,
      }
    : undefined;
  const suppressErrorLog = !failOnNotFound; // if not failing, need to handle error in this call
  try {
    const result = await tryCall(asyncCall, maybeOptions, suppressErrorLog);
    return result?.data ?? null;
  } catch (err) {
    // we need to do this here so that tryCall maintains the async call signature
    if (isAxiosError(err) && err.response?.status === 404 && suppressErrorLog) {
      logger.info(formatAxiosError(err));
      return null;
    }
    throw err;
  }
};

export type WhyLabsCallContext = {
  auth0UserId: string;
  whylabsUserId?: string;
  auditOrigIp?: string;
  operationContext: OperationContext;
  requestId?: string;
};

export const formatContext = (context?: WhyLabsCallContext): string => {
  if (!context) return 'unknown';
  return `user: ${context.whylabsUserId ?? context.auth0UserId} ` + describeOperationContext(context.operationContext);
};

export type CallOptions = {
  errorMapper?: (err: AxiosError) => Error;
  context: WhyLabsCallContext;
  delay?: number;
  delayFactor?: number;
  numRetries?: number;
};

export const defaultCallOptions: Required<Pick<CallOptions, 'delay' | 'delayFactor' | 'numRetries'>> = {
  numRetries: 3,
  delay: 2000,
  delayFactor: 3,
};

export const axiosCallConfig = (options?: CallOptions): { headers: { [key: string]: string } } => {
  const headers: { [key: string]: string } = {};
  if (options) {
    headers[WHYLABS_USER_ID_HEADER] = options.context.whylabsUserId ?? options.context.auth0UserId;
  }

  if (options?.context.auditOrigIp) {
    headers[WHYLABS_USER_IP_HEADER] = options.context.auditOrigIp;
  }
  return { headers };
};

const getErrorLogLevel = (err: unknown): Extract<LevelWithSilent, 'error' | 'warn'> => {
  if (err instanceof ServiceError) {
    return errorCodeToLogLevel(err.code);
  }
  const dashbirdError = extractDashbirdError(err);
  if (dashbirdError) {
    return errorCodeToLogLevel(dashbirdError.code);
  }
  return 'error';
};

/**
 * Wraps errors and retries while maintaining the original call signature. Compare to tryExecute, which may return null.
 * @param asyncCall
 * @param maybeOptions
 * @param logExceptionAsError if true, will always log at error level, otherwise lookup error level
 */
export const tryCall = async <TResult>(
  asyncCall: () => Promise<TResult>,
  maybeOptions?: CallOptions,
  logExceptionAsError = false,
): Promise<TResult> => {
  const options: CallOptions & Required<Pick<CallOptions, 'delay' | 'delayFactor' | 'numRetries'>> = {
    ...defaultCallOptions,
    context: { auth0UserId: '', operationContext: {} },
    ...maybeOptions,
  };
  const { numRetries, delay, delayFactor, context } = options;
  // maybe we can refactor at some point so we can apply the data service query mapper just to dataservice calls
  const errorMapper = options.errorMapper ?? mapDataServiceQueryError;
  try {
    return await asyncCall();
  } catch (err) {
    if (!isAxiosError(err)) {
      logger.error(err, `Unknown error when calling ${formatContext(context)}. Getting error type: ${typeof err}`);
      throw err;
    }
    if (numRetries && shouldRetryAxiosReq(err)) {
      logger.warn(
        err,
        `Failed to execute call ${formatContext(context)} with err ${formatAxiosError(err)}. Retry in ${
          delay / 1000
        } seconds.`,
      );
      await sleepAsync(delay + getRandomNumber(100));
      return tryCall(asyncCall, { ...options, delay: delayFactor * delay, numRetries: numRetries - 1 });
    }
    const mappedError = errorMapper(err);
    if (!logExceptionAsError) {
      const level = getErrorLogLevel(mappedError);
      logger[level](err, `Failed to execute call ${formatContext(context)}. Axios error: ${formatAxiosError(err)}`);
    }
    throw mappedError;
  }
};

export const addToContext = (fields: Partial<OperationContext>, options?: CallOptions): CallOptions => {
  options = options ?? { context: { auth0UserId: '', operationContext: {} } };
  const opCtx: OperationContext = options.context.operationContext;
  options.context = options.context ?? { operationContext: { ...opCtx, ...fields } };
  return options;
};
