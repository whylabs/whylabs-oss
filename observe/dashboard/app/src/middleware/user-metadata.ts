import { Role, User } from '@whylabs/songbird-node-client';
import { OpenIDUser } from 'openid-client';

import { WHYLABS_OIDC_WHYLABS_ROLE_MAPPING } from '../constants';
import { DEMO_ORG_ID } from '../graphql/authz/user-context';
import { allUserMemberships } from '../graphql/resolvers/helpers/users';
import { getLogger } from '../providers/logger';
import { getDefaultMembership, getUserById } from '../services/data/songbird/api-wrappers/memberships';
import { getUserByEmail } from '../services/data/songbird/api-wrappers/users';
import { Auth0ImpersonationMetadata } from '../services/security/auth0-wrapper';
import { getIdentityForImpersonation } from '../services/security/impersonation-identity-helper';
import { WhyLabsCallContext, defaultCallOptions } from '../util/async-helpers';
import { formatAxiosError } from '../util/logging';

const logger = getLogger('UserMetadataLogger');

const ONE_MINUTES_IN_MILLIS = 60 * 1000;

export interface Membership {
  orgId?: string;
  role?: Role;
}

// Add information here very sparingly as it is stored in the cookie and may cause us to hit header limit
export type WhyLabsUserMetadata = {
  auth0Id: string;
  userId: string;
  email: string;
  name?: string;
  whylabsAdmin: boolean; // whether the user is a whylabs admin
  includeClaims: boolean; // whether the user logged in with claims
  impersonator?: string; // auth0 ID of impersonator - should not be persisted in Auth0
  impersonatorEmail?: string; // email of impersonator - should not be persisted in Auth0
  memberships: Membership[]; // this is songbird-managed memberships, not implied memberships like anon session/demo org
  defaultOrgId?: string; // this is the default org and should always be a songbird-managed membership
  lastSyncedTimeInEpochMillis: number; // utc millis
};

/*
 * This is for session metadata that is stored in the cookie.
 */
export interface SessionMetadata {
  userMetadata?: WhyLabsUserMetadata;
  // dont store impersonation in session metadata, parallel updates mess it up
}

export const EMPTY_SESSION_METADATA: SessionMetadata = {
  userMetadata: undefined,
};

const validUserMetadata = (
  userMeta: WhyLabsUserMetadata | undefined,
  openIDUser: OpenIDUser,
  impersonatedUserId?: string,
): boolean => {
  return !!(
    userMeta &&
    userMeta.auth0Id === openIDUser.sub &&
    userMeta.defaultOrgId &&
    openIDUser?.email &&
    ((!impersonatedUserId && userMeta.email.toLocaleLowerCase() === openIDUser.email.toLocaleLowerCase()) ||
      (impersonatedUserId && userMeta.impersonator === openIDUser.sub && userMeta.userId === impersonatedUserId))
  );
};

// refresh the membership metadata every one minute
const membershipsNeedRefreshing = (userMeta: WhyLabsUserMetadata): boolean => {
  const oldestLastSyncTimeAllowed = Date.now() - ONE_MINUTES_IN_MILLIS;
  return (
    !userMeta || userMeta.memberships.length === 0 || userMeta.lastSyncedTimeInEpochMillis < oldestLastSyncTimeAllowed
  );
};

type ValidatedImpersonationMetadata = {
  userId: string;
  expiration: number;
};

const impersonationHasExpired = (impersonationMetadata?: Auth0ImpersonationMetadata): boolean => {
  if (!impersonationMetadata) {
    return false;
  }
  const { userId, expiration = 0 } = impersonationMetadata;
  return !!(userId && expiration && expiration <= Date.now());
};

export const metadataNeedsRefreshing = (
  userMetadata: WhyLabsUserMetadata,
  realUser: OpenIDUser,
  impersonation?: Auth0ImpersonationMetadata,
): boolean =>
  !validUserMetadata(userMetadata, realUser, impersonation?.userId) ||
  impersonationHasExpired(impersonation) ||
  membershipsNeedRefreshing(userMetadata);

export const validateImpersonationMetadata = (
  impersonationMetadata?: Auth0ImpersonationMetadata,
): ValidatedImpersonationMetadata | undefined => {
  if (!impersonationMetadata) {
    return undefined;
  }
  const { userId, expiration = 0 } = impersonationMetadata;
  if (!userId || expiration <= Date.now()) {
    return undefined;
  }
  return { userId, expiration };
};

const getSessionMemberships = async (
  auth0Id: string,
  email: string,
  includeClaims: boolean,
  callContext: WhyLabsCallContext,
): Promise<Pick<WhyLabsUserMetadata, 'memberships' | 'defaultOrgId'> | null> => {
  logger.debug(`Refetch memberships for ${email}`);
  const callOptions = {
    ...defaultCallOptions,
    context: { ...callContext, operationContext: { name: 'getSessionMemberships' } },
  };
  const defaultMembership = await getDefaultMembership(auth0Id, email, callOptions);
  const memberships = (await allUserMemberships(email, auth0Id, includeClaims, callOptions)).map((m) => ({
    role: m.role,
    orgId: m.orgId,
  }));
  let defaultOrgId = defaultMembership?.orgId;
  if (!defaultOrgId) {
    const fallbackMembership = memberships.find((m) => m.orgId !== DEMO_ORG_ID);
    // selecting demo org as the default causes bad behavior in the UI
    defaultOrgId = fallbackMembership ? fallbackMembership.orgId : undefined;
    if (!defaultOrgId) {
      logger.warn('No non-demo memberships found for user %s', email);
      return null;
    }
  }

  // It is important to store the minimum information here as we may easily hit the 8KB header limit
  // e.g. we may need to encode the membership info into a denser format, or have some scheme for deciding when we
  // can't store memberships
  return {
    memberships,
    defaultOrgId,
  };
};

export const establishUserMetadata = async (
  openIDUser: OpenIDUser,
  whylabsAdmin: boolean,
  includeClaims: boolean,
  callContext: WhyLabsCallContext,
): Promise<WhyLabsUserMetadata | null> => {
  let existingUser: User | null = null;
  if (!openIDUser.email) {
    logger.error(`No email provided for ${openIDUser.sub}`);
    return null;
  }
  try {
    existingUser = await getUserByEmail(openIDUser.email, {
      ...defaultCallOptions,
      context: { ...callContext, operationContext: { name: 'establishUserMetadata' } },
    });
  } catch (e) {
    logger.error(e, `Unexpected error getting user by email: ${formatAxiosError(e)}`);
    return null;
  }
  if (!existingUser) {
    // this can happen during onboarding - user can be in auth0 but not in songbird
    return establishMetadataFromOpenIDUser(openIDUser);
  }

  const sessionMembershipInfo = await getSessionMemberships(
    openIDUser.sub,
    openIDUser.email,
    includeClaims,
    callContext,
  );
  if (!sessionMembershipInfo) return null;

  return {
    auth0Id: openIDUser.sub,
    userId: existingUser?.userId,
    email: existingUser?.email,
    name: openIDUser.name,
    whylabsAdmin,
    includeClaims,
    lastSyncedTimeInEpochMillis: Date.now(),
    ...sessionMembershipInfo,
  };
};

export const establishImpersonatedUserMetadata = async (
  auth0Id: string,
  auth0Email: string,
  impersonation: ValidatedImpersonationMetadata,
  callContext: WhyLabsCallContext,
): Promise<WhyLabsUserMetadata | null> => {
  let impersonatedAuth0User: OpenIDUser | null;
  try {
    const options = {
      ...defaultCallOptions,
      context: { ...callContext, operationContext: { name: 'establishImpersonatedUserMetadata' } },
    };
    const targetWhyLabsUser = await getUserById(impersonation.userId, options);
    // this is doing some 'best match' to find auth0 user to impersonate, as a user may have multiple identities in auth0
    // corresponding to different ways they have logged in
    impersonatedAuth0User = targetWhyLabsUser ? await getIdentityForImpersonation(targetWhyLabsUser.email) : null;
    if (!impersonatedAuth0User?.email) {
      return null;
    }
  } catch (e) {
    logger.warn({ sub: auth0Id }, `Error getting user to impersonate ${impersonation.userId}`);
    return null;
  }
  const includeClaims = !!impersonatedAuth0User[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING];
  const userMetadata = await establishUserMetadata(
    impersonatedAuth0User,
    false, // if you impersonate a whylabsAdmin, you dont get those privileges
    includeClaims,
    callContext,
  );
  if (!userMetadata) return null;
  return {
    ...userMetadata,
    impersonator: auth0Id, // this should be real user id
    impersonatorEmail: auth0Email, // this should be real user email
  };
};

/**
 * This function should only be used during the onboarding process, when the user's email is not yet verified
 * @param openIDUser
 */
export const establishMetadataFromOpenIDUser = (openIDUser: OpenIDUser | null): WhyLabsUserMetadata | null => {
  if (!openIDUser) return null;
  return {
    auth0Id: openIDUser.sub,
    userId: 'unknown',
    name: openIDUser.name,
    email: openIDUser.email ?? 'unknown', // email should always be present
    includeClaims: !!openIDUser.whylabs_role_mappings,
    whylabsAdmin: false, // in the onboarding cases where this is needed, the user shouldnt be given whylabs admin until their email is verified
    lastSyncedTimeInEpochMillis: Date.now(),
    memberships: [],
    defaultOrgId: undefined,
  };
};
