import { AxiosError } from 'axios';

export type SongbirdErrorType =
  | 'SchemaValidation'
  | 'MonitorConfigValidation'
  | 'IllegalArgument'
  | 'ResourceAlreadyExists'
  | 'ResourceConstraint'
  | 'ArgumentValue';

type SongbirdErrorBody = {
  message?: string;
  requestId?: string;
  type?: SongbirdErrorType;
  path?: string;
  parameter?: string;
};

export const isAxiosError = (err: unknown): err is AxiosError<SongbirdErrorBody> => (err as AxiosError).isAxiosError;

export const sleepAsync = async (milliseconds: number): Promise<void> =>
  new Promise((r) => setTimeout(r, milliseconds));

export const formatAxiosError = (err: unknown): string | null => {
  if (!isAxiosError(err)) return null;
  const { config, response } = err;
  const { url, method } = config ?? {};
  const { status, statusText, data } = response ?? {};
  const { message, requestId, type } = data ?? {};
  return `Request ${requestId ?? ''} failed with status ${status}. Message: ${
    message ?? statusText ?? err.message
  } (${type}). URL: ${method?.toUpperCase()}:${url}`;
};
