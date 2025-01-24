import { unwrapResolverError } from '@apollo/server/errors';
import { AxiosError } from 'axios';
import { GraphQLFormattedError } from 'graphql';

// BEWARE do not import anything that uses logging or you'll get a circular dependency
import {
  DataServiceErrorBody,
  SongbirdErrorBody,
  SongbirdErrorType,
} from '../services/data/songbird/api-wrappers/utils';
import { SongbirdServiceError } from '../services/errors/songbird-service-errors';

// properties that should be removed from logs and/or errors returned by Apollo, as they may contain sensitive data
export const SensitiveErrorProps = [
  'request', // request object
  'response', // response object
  'config', // request params
  'err.request', // request object on errors
  'err.response', // response object on errors
  'err.config', // request params on errors
] as const;

export type WhyLabsAxiosError = AxiosError<SongbirdErrorBody | DataServiceErrorBody>;

export const isAxiosError = (err: unknown): err is WhyLabsAxiosError => (err as WhyLabsAxiosError).isAxiosError;

export type WhyLabsErrorType = SongbirdErrorType | undefined;
export const getErrorType = (err: WhyLabsAxiosError): WhyLabsErrorType => {
  const dataObj = err.response?.data ?? {};
  return typeof dataObj === 'object' && 'type' in dataObj ? dataObj.type : undefined;
};

export const getErrorParameter = (err: WhyLabsAxiosError): string | undefined => {
  const dataObj = err.response?.data ?? {};
  return typeof dataObj === 'object' && 'parameter' in dataObj ? dataObj.parameter : undefined;
};

export const formatAxiosError = (err: unknown): string | null => {
  if (!isAxiosError(err)) return null;
  const { config, response } = err;
  const { url, method } = config ?? {};
  const { status, statusText, data } = response ?? {};
  const dataObj = data ?? {};
  const { message } = dataObj;

  const isObject = typeof dataObj === 'object';
  const requestId =
    isObject && 'requestId' in dataObj ? dataObj.requestId : err.response?.headers['X-REQUEST-ID'] ?? '';
  const type = getErrorType(err);
  const embeddedErrors = isObject && '_embedded' in dataObj ? dataObj._embedded?.errors ?? [] : [];
  const shortMessage = message ?? statusText;
  let fullMessage =
    embeddedErrors.length > 0 ? `${shortMessage} - ${embeddedErrors.map((e) => e.message).join(',')}` : shortMessage;
  if (type) fullMessage += ` (${type})`;
  fullMessage = fullMessage ? `Message: ${fullMessage}. ` : '';
  return `Request ${requestId} failed with status ${
    status ?? statusText
  }. ${fullMessage} URL: ${method?.toUpperCase()}:${url}`;
};

export const formatAxiosStatusText = (err: unknown): string | null => {
  if (!isAxiosError(err)) return null;
  const { config, response } = err;
  const { url, method } = config ?? {};
  const { statusText } = response ?? {};
  return `${statusText}. URL: ${method?.toUpperCase()}:${url}`;
};

/**
 * Ensures the stack trace is preserved in case of Axios errors and adds additional context if the underlying problem was a failed http request
 * @param formattedError GraphQL error
 * @param error original error
 */
export const enrichGQLErrorMsg = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
  // V4 formatting is different https://www.apollographql.com/docs/apollo-server/migration/#error-formatting-changes
  const originalError = unwrapResolverError(error);
  const exception: Record<string, unknown> = {
    ...(typeof originalError === 'object' ? originalError : null),
  };
  delete exception.extensions;
  if (formattedError.extensions?.stacktrace) {
    exception.stacktrace = formattedError.extensions.stacktrace;
  }
  // Workaround pending wrapping songbird as a datasource and mapping service errors into graphql errors there
  if (originalError instanceof SongbirdServiceError) {
    return {
      ...formattedError,
      extensions: { code: originalError.code, safeErrorMsg: originalError.message },
    };
  }

  if (isAxiosError(exception)) {
    // get additional Axios error context
    const { message: requestErrorMsg } = exception?.response?.data ?? {};
    const requestErrType = getErrorType(exception);
    const songbirdSafeErr = `${requestErrType} - ${requestErrorMsg}`;
    const errMsg = requestErrType ? songbirdSafeErr : formatAxiosStatusText(exception) ?? 'No details';
    return {
      ...formattedError,
      message: `${formattedError.message}. Error: ${errMsg}`,
    };
  }

  return formattedError;
};
