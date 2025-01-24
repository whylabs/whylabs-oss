import { User } from '@whylabs/songbird-node-client';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { extractEmailDomain } from '../../../../util/misc';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const getUserByEmail = async (email: string, options?: CallOptions): Promise<User | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(() => client.users.getUserByEmail(email, axiosCallConfig(options)), true, options?.context);
};
export const createUser = async (email: string, options?: CallOptions): Promise<User> => {
  const emailDomain = extractEmailDomain(email);
  logger.info('Creating a user with email domain %s', emailDomain);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(() => client.users.createUser({ email }, axiosCallConfig(options)), options);
  const user = response?.data;
  logger.info('Successfully created user with email domain %s. User ID: ', emailDomain, user.userId);
  return user;
};
/**
 * Saves the provided User object
 * @param user User object to save
 */
export const updateUser = async (user: User, options?: CallOptions): Promise<void> => {
  logger.info('Updating user %s', user.userId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(() => client.users.updateUser(user, axiosCallConfig(options)), options);
  logger.info('Successfully updated user %s', user.userId);
};
