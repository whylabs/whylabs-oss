import LRU from 'lru-cache';
import { v3 as murmurhash } from 'murmurhash';
import { OpenIDUser } from 'openid-client';

import { config } from '../../config';
import { WHYLABS_OIDC_CONN_NAME, WHYLABS_OIDC_CONN_STRATEGY, WHYLABS_OIDC_WHYLABS_ROLE_MAPPING } from '../../constants';
import { getLogger } from '../../providers/logger';
import { fnThrow } from '../../util/misc';
import { isString } from '../../util/type-guards';
import { getAuth0UsersByEmail } from './auth0-wrapper';

const nodeCount = config.totalNodes ?? 1;

const logger = getLogger('ImpersonationIdentityHelper');

// cache of email -> User
// Auth0 has pretty low rate limits, which we don't want to hit by looking up the users during impersonation too often
const UserIdentityCache = new LRU<string, Promise<OpenIDUser>>({
  max: 100,
  ttl: nodeCount * 15 * 1000, // 15 seconds per Dashbird instance
});

const getOrGenerateImpersonationTarget = async (email: string): Promise<OpenIDUser> => {
  const allMatchingUsers = await getAuth0UsersByEmail(email).catch((err) => {
    // ignore errors here
    logger.warn(err, 'Failed to fetch Auth0 users by email, proceeding without them');
    return [];
  });

  const match =
    allMatchingUsers
      // prefer social-based identities (by skipping email/pw and auth0-created identities), so we have the full profile
      .find((u) => !u.user_id?.startsWith('email') && !u.user_id?.startsWith('auth0')) ??
    // pick first available user otherwise
    allMatchingUsers.shift() ??
    // didn't find anyone :(
    null;
  const identity = match?.identities[0];
  if (match && isString(match.whylabs_role_mappings)) {
    match.whylabs_role_mappings = [match.whylabs_role_mappings];
  }

  return {
    ...match,
    // mock the user id and other properties if we didn't find the user in Auth0
    sub: match?.user_id ?? `dashbird|${murmurhash(email)}`, // hash the user's email to generate stable fake ID
    email: match?.email ?? email,
    email_verified: !!match?.email_verified,
    // include info needed for role claims
    [WHYLABS_OIDC_WHYLABS_ROLE_MAPPING]: match?.whylabs_role_mappings,
    [WHYLABS_OIDC_CONN_NAME]: identity?.connection,
    [WHYLABS_OIDC_CONN_STRATEGY]: identity?.provider,
    // Note the roles claim (check for whylabs admin) will NOT be present in an impersonated user - would need an extra call to fetch user role
    // but impersonating another WhyLabs Admin who might then impersonate someone is not a priority scenario!
  };
};

export const getIdentityForImpersonation = async (email: string): Promise<OpenIDUser> => {
  if (!UserIdentityCache.has(email)) {
    UserIdentityCache.set(email, getOrGenerateImpersonationTarget(email));
  }

  return UserIdentityCache.get(email) ?? fnThrow('No user found in cache. This should never happen.');
};
