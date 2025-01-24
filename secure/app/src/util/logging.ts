import { AxiosError } from 'axios';

type ErrorType =
  | 'SchemaValidation'
  | 'MonitorConfigValidation'
  | 'IllegalArgument'
  | 'ResourceAlreadyExists'
  | 'ResourceConstraint'
  | 'ArgumentValue';

export const isAxiosError = (err: unknown): err is AxiosError => (err as AxiosError).isAxiosError;

type WhyLabsErrorType = ErrorType | undefined;
export const getErrorType = (err: AxiosError): WhyLabsErrorType => {
  const dataObj = err.response?.data ?? {};
  return typeof dataObj === 'object' && 'type' in dataObj ? dataObj.type : undefined;
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
  const shortMessage = message ?? statusText;
  let fullMessage = shortMessage;
  if (type) fullMessage += ` (${type})`;
  fullMessage = fullMessage ? `Message: ${fullMessage}. ` : '';
  return `Request ${requestId} failed with status ${
    status ?? statusText
  }. ${fullMessage} URL: ${method?.toUpperCase()}:${url}`;
};
