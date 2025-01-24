import v8 from 'v8';

import { isNetworkError } from 'axios-retry';
import { GraphQLError } from 'graphql';
import { chunk } from 'lodash';
import pino, { LevelWithSilent } from 'pino';

import {
  WHYLABS_IMPERSONATOR_HEADER,
  WHYLABS_ORG_HEADER,
  WHYLABS_USER_ID_HEADER,
  WHYLABS_USER_IP_HEADER,
} from '../constants';
import { errorCodeToLogLevel, extractDashbirdError } from '../errors/dashbird-error';
import { GraphQLContext } from '../graphql/context';
import { getLogger } from '../providers/logger';
import { DataServiceClient, dataServiceClient } from '../services/data/data-service/data-service-client-factory';
import { SongbirdClient } from '../services/data/songbird/songbird-client-factory';
import { mapDataServiceQueryError } from '../services/errors/error-wrapper';
import { ServiceError } from '../services/errors/service-errors';
import { WhyLabsAxiosError, formatAxiosError, isAxiosError } from './logging';
import { NONE, OperationContext, Option, describeOperationContext } from './misc';
import { getRandomNumber } from './random';

const logger = getLogger('AsyncUtils');
const BYTES_PER_MB = 1024 ** 2;

export const sleepAsync = async (milliseconds: number): Promise<void> =>
  new Promise((r) => setTimeout(r, milliseconds));

const getActivityDuration = (preciseStart: [number, number]): number => {
  const elapsed = process.hrtime(preciseStart);
  const seconds = elapsed[0];
  // divide by a million to get nano to milli
  const millis = parseFloat((elapsed[1] / 1000000).toFixed(0));

  // returns milliseconds
  return seconds * 1000 + millis;
};

/**
 * Runs the specified activity and times it, producing both logs and CloudWatch Metrics for the operation.
 * Uses information from the associated GraphQL Context (if provided) to populate the logs/metrics
 * @param logger
 * @param activityName
 * @param context
 * @param activity
 */
export const runTimedActivityAsync = async <T>(
  logger: pino.Logger,
  activityName: string,
  context: WhyLabsCallContext,
  activity: () => Promise<T>,
): Promise<T> => {
  const { requestId, auth0UserId } = context;
  const operationName = context.operationContext?.name;
  const orgId = context.operationContext?.orgId ?? '';
  logger.info(
    'Starting activity %s. GQL operation %s, user %s, org %s, request %s. Current memory usage: %s MB',
    activityName,
    operationName,
    auth0UserId,
    orgId,
    requestId,
    v8.getHeapStatistics().total_heap_size / BYTES_PER_MB,
  );

  const start = process.hrtime();

  let succeeded = true;
  let error: unknown | null = null;

  try {
    return await activity();
  } catch (err) {
    succeeded = false;
    error = err;
    throw mapIfServiceError(err);
  } finally {
    const duration = getActivityDuration(start);

    if (succeeded && !error) {
      logger.info(
        'Activity %s succeeded after %sms. GraphQL operation %s, user %s, org %s, request %s',
        activityName,
        duration,
        operationName,
        auth0UserId,
        orgId,
        requestId,
      );
    } else {
      const level: LevelWithSilent = getErrorLogLevel?.(error) ?? 'error';

      logger[level](
        error,
        'Activity %s FAILED after %sms. GraphQL operation %s, user %s, org %s, request %s',
        activityName,
        duration,
        operationName,
        auth0UserId,
        orgId,
        requestId,
      );
    }
  }
};

type RunAllResult<T> = { successes: T[]; failures: (Error | string)[] };

/**
 * Runs the specified tasks concurrently, splits them up by success/failure
 * @param tasks
 */
export const runAll = async <T>(...tasks: Promise<T>[]): Promise<RunAllResult<T>> => {
  const results = await Promise.allSettled(tasks);
  return results.reduce(
    (map, r) => {
      if (r.status === 'fulfilled') {
        map.successes.push(r.value);
      } else {
        map.failures.push(r.reason);
      }
      return map;
    },
    { successes: [], failures: [] } as RunAllResult<T>,
  );
};

/**
 * Throws if the specified promise does not complete in time
 * @param promise
 * @param timeoutMs
 */
export const timeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: NodeJS.Timeout;

  const timeoutTask: Promise<never> = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Activity timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutTask]).then(
    (v) => {
      clearTimeout(timeout);
      return v;
    },
    (err) => {
      clearTimeout(timeout);
      throw err;
    },
  );
};

const retryableAxiosCodes = new Set([408, 502, 503, 504]);

export const shouldRetryAxiosReq = (err: WhyLabsAxiosError): boolean => {
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
  errorMapper?: (err: WhyLabsAxiosError) => Error,
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
  impersonatorEmail?: string;
  auditOrigIp?: string;
  operationContext: OperationContext;
  requestId?: string;
  dataServiceClient?: DataServiceClient;
  songbirdClient?: SongbirdClient;
};

export const formatContext = (context?: WhyLabsCallContext): string => {
  if (!context) return 'unknown';
  return `user: ${context.whylabsUserId ?? context.auth0UserId} ` + describeOperationContext(context.operationContext);
};

export type CallOptions = {
  errorMapper?: (err: WhyLabsAxiosError) => Error;
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
  if (options?.context.operationContext.orgId) {
    headers[WHYLABS_ORG_HEADER] = options.context.operationContext.orgId;
  }
  if (options?.context.auditOrigIp) {
    headers[WHYLABS_USER_IP_HEADER] = options.context.auditOrigIp;
  }
  if (options?.context.impersonatorEmail) {
    headers[WHYLABS_IMPERSONATOR_HEADER] = options.context.impersonatorEmail;
  }
  return { headers };
};

export const mapServiceErrorToGraphQL = (err: ServiceError): GraphQLError => {
  return new GraphQLError(err.message, { extensions: { code: err.code, safeErrorMsg: err.message } });
};

export const mapIfServiceError = (err: unknown): unknown => {
  if (err instanceof ServiceError) {
    return mapServiceErrorToGraphQL(err);
  }
  return err;
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
export type GraphqlCallContext = Option<Partial<GraphQLContext>>;
export const unknownContext = { auth0UserId: '', operationContext: {} };

export const whylabsCxtFromGraphqlCxt = (cxt: GraphqlCallContext): WhyLabsCallContext => {
  if (cxt === NONE) return unknownContext;
  const impersonation = cxt.userContext?.impersonation;
  return {
    auth0UserId: cxt.userContext?.auth0User?.sub ?? '',
    whylabsUserId: cxt.userContext?.membership?.userId,
    impersonatorEmail: impersonation?.originalUserEmail ?? impersonation?.originalUserId, // undefined when no impersonation
    auditOrigIp: cxt.request?.ip,
    operationContext: { name: cxt.operationName, orgId: cxt.userContext?.membership?.orgId },
    dataServiceClient,
  };
};
export const callOptionsFromGraphqlCxt = (cxt?: GraphqlCallContext): CallOptions => {
  if (!cxt || cxt === NONE) return { ...defaultCallOptions, context: { auth0UserId: '', operationContext: {} } };
  return {
    ...defaultCallOptions,
    context: whylabsCxtFromGraphqlCxt(cxt),
  };
};

export const addToContext = (fields: Partial<OperationContext>, options?: CallOptions): CallOptions => {
  options = options ?? { context: { auth0UserId: '', operationContext: {} } };
  const opCtx: OperationContext = options.context.operationContext;
  options.context = options.context ?? { operationContext: { ...opCtx, ...fields } };
  return options;
};

/*
 * Helper function to split async calls in chunks to prevent network exceeds
 * */
export const processPromiseInChunks = async <DataType>(
  data: DataType[],
  callback: (item: DataType) => Promise<void>,
  chunkSize: number,
  allowFailures = false,
): Promise<void> => {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk: DataType[] = data.slice(i, i + chunkSize);
    if (allowFailures) {
      await Promise.allSettled(chunk.map(callback));
      continue;
    }
    await Promise.all(chunk.map(callback));
  }
};

export const chunkedTryCall = async <ReturnType>(
  queries: (() => Promise<ReturnType>)[],
  chunkSize: number,
  options?: CallOptions,
): Promise<ReturnType[]> => {
  const chunkedQueries = chunk(queries, chunkSize);
  const responses: ReturnType[] = [];
  for (const batch of chunkedQueries) {
    const batchResponses = await Promise.all(batch.map((query) => tryCall(query, options)));
    responses.push(...batchResponses);
  }
  return responses;
};
