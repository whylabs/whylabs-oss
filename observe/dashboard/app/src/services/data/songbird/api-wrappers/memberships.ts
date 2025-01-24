import { Membership, MembershipMetadata, Role, User } from '@whylabs/songbird-node-client';
import { OpenIDUser } from 'openid-client';

import { WHYLABS_OIDC_CONN_NAME, WHYLABS_OIDC_WHYLABS_ROLE_MAPPING } from '../../../../constants';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { extractEmailDomain } from '../../../../util/misc';
import { mapSongbirdValidationError } from '../../../errors/error-wrapper';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const getUserById = async (userId: string, options?: CallOptions): Promise<User | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(() => client.users.getUser(userId, axiosCallConfig(options)), true, options?.context);
};

const tryModifyMemberships = async <T>(writer: () => Promise<T>, maybeOptions?: CallOptions): Promise<T> => {
  const options: CallOptions = maybeOptions
    ? { ...maybeOptions, errorMapper: mapSongbirdValidationError }
    : {
        context: { auth0UserId: '', operationContext: { name: 'tryModifyMemberships' } },
        errorMapper: mapSongbirdValidationError,
      };
  return tryCall(writer, options);
};

export const createMembership = async (
  orgId: string,
  userId: string,
  email: string,
  role: Role,
  createdBy: string,
  maybeOptions?: CallOptions,
): Promise<MembershipMetadata> => {
  logger.info('Creating membership for org %s, user %s', orgId, userId);
  const client = maybeOptions?.context?.songbirdClient ?? songbirdClient;
  const response = await tryModifyMemberships(() =>
    client.membership.createMembership({ orgId, email, role, createdBy }, axiosCallConfig(maybeOptions)),
  );

  logger.info('Successfully created membership for org %s, user %s', orgId, userId);
  return response.data;
};
/**
 * Updates membership by email
 * @param orgId Target org
 * @param email Target user's email
 * @param role Updated role
 * @param options Call options
 */
export const updateMembershipByEmail = async (
  orgId: string,
  email: string,
  role: Role,
  options?: CallOptions,
): Promise<MembershipMetadata> => {
  const emailDomain = extractEmailDomain(email);
  logger.info('Updating membership for org %s, email domain %s, role %s', orgId, emailDomain, role);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryModifyMemberships(
    () => client.membership.updateMembershipByEmail({ orgId, email, role }, axiosCallConfig(options)),
    options,
  );
  logger.info('Successfully updated membership for org %s, email domain %s, user %s', orgId, emailDomain, role);
  return response.data;
};
/**
 * Removes membership by email
 * @param orgId Target org
 * @param email Target user's email
 * @param userId Target user's ID for logging purposes, if available
 * @param options Call options
 */
export const removeMembershipByEmail = async (
  orgId: string,
  email: string,
  userId?: string,
  options?: CallOptions,
): Promise<void> => {
  const emailDomain = extractEmailDomain(email);
  logger.info('Removing membership for org %s, email domain %s, user %s', orgId, emailDomain, userId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryModifyMemberships(
    () => client.membership.removeMembershipByEmail({ orgId, email }, axiosCallConfig(options)),
    options,
  );
  logger.info('Successfully removed membership for org %s, email domain %s, user %s', orgId, emailDomain, userId);
};
export const setDefaultMembership = async (orgId: string, userId: string, options?: CallOptions): Promise<void> => {
  logger.info('Setting user %s default org to %s', userId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryModifyMemberships(
    () => client.membership.setDefaultMembership({ orgId, userId }, axiosCallConfig(options)),
    options,
  );
  logger.info('Successfully set user %s default org to %s', userId, orgId);
};
export const getDefaultMembership = async (
  auth0Id: string,
  email: string,
  options?: CallOptions,
): Promise<Membership | null> => {
  logger.info('Getting default membership for Auth0 user %s', auth0Id);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const membership = await tryGetMetadata(
    () => client.membership.getDefaultMembershipForEmail(email, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return membership?.membership ?? null;
};
export const getMembershipsByOrg = async (
  orgId: string,
  includeClaims: boolean,
  options?: CallOptions,
): Promise<Membership[]> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const memberships = await tryGetMetadata(
    () => client.membership.getMembershipsByOrg(orgId, includeClaims, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return Array.from(memberships?.memberships ?? []);
};
export const getMembershipsByEmail = async (
  email: string,
  includeClaims: boolean,
  options?: CallOptions,
): Promise<Membership[]> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const memberships = await tryGetMetadata(
    () => client.membership.getMembershipsByEmail(email, includeClaims, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return Array.from(memberships?.memberships ?? []);
};
export const getMembershipsByUserId = async (
  userId: string,
  includeClaims: boolean,
  options?: CallOptions,
): Promise<Membership[]> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const memberships = await tryGetMetadata(
    () => client.membership.getMemberships(userId, includeClaims, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return Array.from(memberships?.memberships ?? []);
};

export const updateMembershipsFromClaims = async (user: OpenIDUser, options?: CallOptions): Promise<void> => {
  if (user.email && user[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING] && user[WHYLABS_OIDC_CONN_NAME]) {
    const email: string = user.email;
    const roleClaims = {
      roleMappings: user[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING],
      connectionName: user[WHYLABS_OIDC_CONN_NAME],
    };
    const client = options?.context?.songbirdClient ?? songbirdClient;
    await tryGetMetadata(
      () => client.membership.updateMembershipByClaims(email, roleClaims, axiosCallConfig(options)),
      true,
      options?.context,
    );
  }
};
