import { ValidateUserSessionResponse } from '@whylabs/songbird-node-client';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { songbirdClient } from '../songbird-client-factory';
import { logger } from './utils';

export const validateUserSession = async (
  sessionId: string,
  options?: CallOptions,
): Promise<ValidateUserSessionResponse> => {
  logger.debug('Validating user session %s', sessionId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.security.validateUserSession(sessionId, axiosCallConfig(options)),
    options,
  );
  return response.data;
};

export const revokeUserSession = async (sessionId: string, options?: CallOptions): Promise<void> => {
  logger.info('Revoking validation for user session %s', sessionId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(() => client.security.revokeUserSession({ sessionId }, axiosCallConfig(options)), options);
};
