import { UserApiKey } from '@whylabs/songbird-node-client';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { songbirdClient } from '../songbird-client-factory';
import { logger } from './utils';

export const generateApiKey = async (
  orgId: string,
  userId: string,
  alias: string,
  expiresAt: number | null,
  requestedScopes: string[] | null = null,
  options?: CallOptions,
): Promise<UserApiKey> => {
  const scopes = requestedScopes ?? [':user'];
  logger.info('Generating an api key for user %s, org %s, expiry %s, scope %s', userId, orgId, expiresAt, scopes);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.apiKeys.createApiKey(orgId, userId, expiresAt ?? undefined, scopes, alias, axiosCallConfig(options)),
    options,
  );
  return response.data;
};
export const listApiKeysForOrg = async (orgId: string, options?: CallOptions): Promise<UserApiKey[]> => {
  logger.info('Listing keys for org %s', orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(() => client.apiKeys.listApiKeys(orgId, undefined, axiosCallConfig(options)), options);
  return Array.from(response.data.items);
};
export const revokeApiKey = async (
  orgId: string,
  userId: string,
  keyId: string,
  options?: CallOptions,
): Promise<UserApiKey> => {
  logger.info('Revoking key %s for user %s, org %s', keyId, userId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.apiKeys.revokeApiKey(orgId, userId, keyId, axiosCallConfig(options)),
    options,
  );
  return response.data;
};
