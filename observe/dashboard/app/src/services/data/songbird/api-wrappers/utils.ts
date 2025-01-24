import { ModelType } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, WhyLabsCallContext, formatContext, tryCall, tryExecute } from '../../../../util/async-helpers';
import { WhyLabsAxiosError, formatAxiosError } from '../../../../util/logging';
import { mapSongbirdValidationError } from '../../../errors/error-wrapper';
import { MonitorConfigValidationError, MonitorSchemaValidationError } from '../../../errors/songbird-service-errors';

export const logger = getLogger('SongbirdWrapper');
// mapped Songbird error types
export type SongbirdErrorType =
  | 'SchemaValidation'
  | 'MonitorConfigValidation'
  | 'IllegalArgument'
  | 'ResourceAlreadyExists'
  | 'ResourceConstraint'
  | 'ArgumentValue';
export type SongbirdErrorBody = {
  message?: string;
  requestId?: string;
  type?: SongbirdErrorType;
  path?: string;
  parameter?: string;
};
export type DataServiceErrorBody = {
  message?: string;
  _embedded?: { errors: { message: string }[] };
};
// try to get metadata, catch 404s and return null
export const tryGetMetadata = async <T>(
  getter: () => Promise<{ data?: T }>,
  retry = true,
  context?: WhyLabsCallContext,
): Promise<T | null> => {
  return tryExecute(getter, retry, false, undefined, context);
};

const mapValidationError =
  (context?: WhyLabsCallContext) =>
  (err: WhyLabsAxiosError): Error => {
    // check for known error types
    const returnedErr: Error = mapSongbirdValidationError(err);
    const isValidationErr =
      returnedErr instanceof MonitorSchemaValidationError || returnedErr instanceof MonitorConfigValidationError;
    const level = isValidationErr ? 'warn' : 'error';
    logger[level](
      returnedErr,
      `Failed to validate metadata ${formatContext(context)}. Axios error: ${formatAxiosError(err)}`,
    );
    return returnedErr;
  };

const tryWriteOrValidateMetadata = async <T>(writer: () => Promise<T>, maybeOptions?: CallOptions): Promise<T> => {
  const options: CallOptions = maybeOptions ?? {
    context: { auth0UserId: '', operationContext: { name: 'tryWriteOrValidateMetadata' } },
  };
  return tryCall(writer, { errorMapper: mapValidationError(options.context), ...options }, true);
};
export const tryWriteMetadata = tryWriteOrValidateMetadata;
export const tryValidateMetadata = tryWriteOrValidateMetadata;

export const mapStringToResourceType = new Map<string, ModelType>([
  ['CLASSIFICATION', ModelType.Classification],
  ['DATA_OTHER', ModelType.DataOther],
  ['DATA_SOURCE', ModelType.DataSource],
  ['DATA_STREAM', ModelType.DataStream],
  ['DATA_TRANSFORM', ModelType.DataTransform],
  ['EMBEDDINGS', ModelType.Embeddings],
  ['LLM', ModelType.Llm],
  ['MODEL_OTHER', ModelType.ModelOther],
  ['RANKING', ModelType.Ranking],
  ['REGRESSION', ModelType.Regression],
  ['UNKNOWN', ModelType.Unknown],
]);
