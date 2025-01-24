import { GetUsers200ResponseOneOfInner, ManagementApiError, ManagementClient } from 'auth0';
import LRU from 'lru-cache';

import { isDebugMode } from '../../config';
import { getLogger } from '../../providers/logger';
import { sleepAsync } from '../../util/async-helpers';
import { extractEmailDomain, fnThrow } from '../../util/misc';
import { SecretType, retrieveSecretManagerSecret } from './secrets';

const logger = getLogger('Auth0ServiceLogger');

export type Auth0User = Pick<
  GetUsers200ResponseOneOfInner,
  'user_id' | 'email' | 'email_verified' | 'name' | 'app_metadata' | 'identities'
> & {
  whylabs_role_mappings?: string[];
};

export type Auth0ImpersonationMetadata = {
  userId?: string; // target WhyLabs user ID
  expiration?: number; // utc millis
};

export type Auth0AppMetadata = {
  impersonation?: Auth0ImpersonationMetadata;
};

export const WhyLabsAdminRole = 'WhyLabs Admin' as const;
export type WhyLabsRole = typeof WhyLabsAdminRole | string;

// Auth0 management tokens are good for a day. Generating a new client with every request to management API unnecessarily performs an auth handshake and spams Auth0 logs.
const auth0clientCache = new LRU<string, ManagementClient>({
  max: 1, // auth0 client is a singleton, so we only need to cache one instance of it
  ttl: 5 * 60 * 1000, // 5 minutes - should be shorter than client token expiration (1 day by default) and not too long, so that clients are allowed to expire and fetch new secrets in case those ever change
});

const clientCacheKey = 'auth0Client';
const getAuth0Client = async (): Promise<ManagementClient> => {
  const cachedClient = auth0clientCache.get(clientCacheKey);
  if (cachedClient) {
    return cachedClient;
  }
  const auth0Secret = await retrieveSecretManagerSecret(SecretType.Auth0);
  if (!auth0Secret) {
    throw Error('Failed to retrieve auth0 secret');
  }
  const newClient = new ManagementClient({
    // try to use API domain, fall back to login domain
    domain: auth0Secret.mgmtDomain,
    clientId: auth0Secret.clientId,
    clientSecret: auth0Secret.clientSecret,
  });

  auth0clientCache.set(clientCacheKey, newClient);

  return newClient;
};

/**
 * Ensures the job reaches completed status within allotted time
 * @param client Auth0 client to use
 * @param jobId
 * @param pollDelayMs Delay between polling attempts
 * @param timeoutAt Timestamp in UTC millis for when to consider the request timed out
 */
const verifyAuth0Job = async (
  client: ManagementClient,
  jobId: string,
  pollDelayMs: number,
  timeoutAt: number,
): Promise<void> => {
  // get updated status after a delay
  await sleepAsync(pollDelayMs);
  const resp = await client.jobs.get({ id: jobId });

  switch (resp.data.status) {
    case 'completed':
      return;
    case 'failed':
      throw Error(`Job ${jobId} failed`);
    default: {
      // check for timeout
      if (Date.now() >= timeoutAt) {
        throw Error(`Job ${jobId} timed out`);
      }

      // recur
      await verifyAuth0Job(client, jobId, pollDelayMs, timeoutAt);
    }
  }
};

export const getAuth0User = async (id: string, warnOnNotFound = false): Promise<Auth0User | null> => {
  logger.info('Fetching user info for user %s', id);

  const client = await getAuth0Client();
  try {
    const user = await client.users.get({ id });
    logger.info(
      `Successfully retrieved user info from Auth0 for user ${id}, rate limit remaining ${user.headers.get(
        'X-RateLimit-Remaining',
      )}`,
    );
    return user.data;
  } catch (err) {
    if (err instanceof ManagementApiError) {
      // during impersonation, we call this function with a string that may be an email, whylabs id or auth0 id
      // which is why we sometimes ignore 400s and 404s
      if ([400, 404].includes(err.statusCode)) {
        if (warnOnNotFound) {
          logger.warn('User %s not found in Auth0', id);
        }
        return null;
      }
    }
    logger.error(err, 'Failed to retrieve user info from Auth0 for user %s', id);
    return null;
  }
};

export const updateAuth0UserMetadata = async (userId: string, metadata: Auth0AppMetadata): Promise<void> => {
  logger.info(`Updating auth0 user ${userId} for ${Object.keys(metadata)}`, userId);
  const client = await getAuth0Client();
  // auth0 merges existing fields in app_metadata, so we do not need to fetch the existing metadata first
  const resp = await client.users.update({ id: userId }, { app_metadata: metadata });
  logger.info(
    `Successfully updated user info from Auth0 for user ${userId}, rate limit remaining ${resp.headers.get(
      'X-RateLimit-Remaining',
    )}`,
  );
};

export const clearImpersonation = async (impersonator?: string): Promise<boolean> => {
  if (isDebugMode()) {
    throw Error('Cannot clear impersonation in debug mode');
  }
  if (impersonator) {
    await updateAuth0UserMetadata(impersonator, { impersonation: {} });
  }

  return true;
};

export const getAuth0UsersByEmail = async (email: string): Promise<Auth0User[]> => {
  logger.info('Fetching Auth0 users with email from domain %s', extractEmailDomain(email));
  const client = await getAuth0Client();
  // Do NOT use the usersByEmail API as this is case-sensitive
  const resp = await client.users.getAll({ q: `email:"${email}"`, search_engine: 'v3' });
  logger.info(
    `Successfully retrieved user by email from Auth0, rate limit remaining ${resp.headers.get(
      'X-RateLimit-Remaining',
    )}`,
  );
  return resp.data;
};

/**
 * The following is intended for sparing use (validating debug mode when app starts up),
 * as it makes two Auth0 mgmt API calls and not efficient ones.
 * @param email
 */
export const checkIsWhyLabsAdmin = async (email: string): Promise<boolean> => {
  const client = await getAuth0Client();
  try {
    const roleResp = await client.roles.getAll();
    const adminRole = roleResp.data.find((role) => role.name === WhyLabsAdminRole);
    if (!adminRole) return false;

    const resp = await client.roles.getUsers({
      id: adminRole.id ?? fnThrow(`Invalid role ID on role ${JSON.stringify(adminRole)} / ${WhyLabsAdminRole}`),
    });
    logger.info(
      `Successfully retrieved whylab admins from auth0, rate limit remaining ${resp.headers.get(
        'X-RateLimit-Remaining',
      )}`,
    );
    return resp.data.find((user) => user.email === email) !== undefined;
  } catch (err) {
    logger.error(err, 'Failed to retrieve whylab admins from auth0');
    return false;
  }
};

export const resendAuth0EmailVerification = async (auth0UserId: string): Promise<void> => {
  const client = await getAuth0Client();
  const resp = await client.jobs.verifyEmail({
    user_id: auth0UserId,
  });

  try {
    // verify that the email was sent successfully
    const timeoutMinutes = 1; // operation will fail after this many minutes worth of waiting for successful state
    const timeoutAt = Date.now() + timeoutMinutes * 60 * 1000;
    const pollDelay = 1000; // 1 second
    await verifyAuth0Job(client, resp.data.id, pollDelay, timeoutAt);
    logger.info('Successfully sent verification email for user %s', auth0UserId);
  } catch (err) {
    logger.error(err, 'Failed to send verification email for user %s', auth0UserId);
    throw err;
  }
};
