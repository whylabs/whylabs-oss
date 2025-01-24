import { IResolvers } from '@graphql-tools/utils';

import { getLogger } from '../../providers/logger';
import {
  createMembership,
  removeMembershipByEmail,
  setDefaultMembership,
  updateMembershipByEmail,
} from '../../services/data/songbird/api-wrappers/memberships';
import { updateOrganizationEmailDomains } from '../../services/data/songbird/api-wrappers/organizations';
import { createUser, getUserByEmail } from '../../services/data/songbird/api-wrappers/users';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { arrayToCommaSeparated } from '../../util/contract-utils';
import { extractEmailDomain } from '../../util/misc';
import { validateEmail } from '../../util/validation';
import { FullGraphQLContext, GraphQLContext } from '../context';
import { gqlToRole, membershipToGQL } from '../contract-converters/songbird/membership-converter';
import { Member, MembershipRole, Resolvers } from '../generated/graphql';

const logger = getLogger('MembershipResolversLogger');

export const addUserToOrg = async (
  orgId: string,
  email: string,
  role?: MembershipRole,
  createdBy?: string,
  context?: GraphQLContext,
): Promise<Member> => {
  validateEmail(email);

  const resolvedRole = role ?? MembershipRole.Admin;
  const createdByUserId = createdBy ?? '';
  const emailDomain = extractEmailDomain(email);
  const options = callOptionsFromGraphqlCxt(context);
  logger.info('Adding user with email domain %s and role %s to org %s', emailDomain, resolvedRole, orgId);
  // TODO: do we really want to automatically create a user here?
  const user = (await getUserByEmail(email, options)) ?? (await createUser(email, options));
  const membership = await createMembership(
    orgId,
    user.userId,
    user.email,
    gqlToRole(resolvedRole),
    createdByUserId,
    options,
  );

  logger.info('Created membership for the specified user with email domain %s. UserID: %s', emailDomain, user.userId);
  return membershipToGQL(membership, user.email);
};

export const updateMember = async (
  orgId: string,
  email: string,
  role: MembershipRole,
  context?: GraphQLContext,
): Promise<Member> => {
  const emailDomain = extractEmailDomain(email);
  logger.info('Updating member with email domain %s to role %s in org %s', emailDomain, role, orgId);
  const options = callOptionsFromGraphqlCxt(context);
  const membership = await updateMembershipByEmail(orgId, email, gqlToRole(role), options);

  logger.info('Successfully updated membership for userID %s to role %s in org %s', membership.userId, role, orgId);
  return membershipToGQL(membership, email);
};

export const removeUserFromOrg = async (orgId: string, email: string, context?: GraphQLContext): Promise<Member> => {
  const emailDomain = extractEmailDomain(email);
  logger.info('Removing user with email domain %s from org %s', emailDomain, orgId);
  const options = callOptionsFromGraphqlCxt(context);
  const user = await getUserByEmail(email, options);
  if (!user?.userId) {
    logger.error('Attempted to remove non-existent or invalid user from org %s. Email domain %s', orgId, emailDomain);
    return { email, orgId, role: MembershipRole.Unknown, userId: '' };
  }
  const userId = user?.userId;

  await removeMembershipByEmail(orgId, email, userId, options);

  logger.info('User with email domain %s successfully removed from org %s', emailDomain, orgId);
  return { userId, orgId, email, role: MembershipRole.Unknown };
};

export const setUserDefaultOrg = async (orgId: string, email: string, context?: GraphQLContext): Promise<boolean> => {
  const emailDomain = extractEmailDomain(email);
  const options = callOptionsFromGraphqlCxt(context);
  logger.info('Setting the default org for user with domain %s to %s', emailDomain, orgId);
  const user = await getUserByEmail(email, options);
  if (!user?.userId)
    throw new Error(`Cannot assign user with email domain ${emailDomain} to org ${orgId}: user doesn't exist`);

  await setDefaultMembership(orgId, user.userId, options);

  logger.info('Successfully set the default org for user with domain %s to %s', emailDomain, orgId);
  return true;
};

const resolvers: Resolvers<FullGraphQLContext> = {
  MembershipManagement: {
    add: async (parent, { email, role }, { resolveUserOrgID, resolveWhyLabsUserId }): Promise<Member> =>
      addUserToOrg(resolveUserOrgID(), email, role ?? undefined, resolveWhyLabsUserId()),
    bulkAdd: async (parent, { emails, role }, context): Promise<Member[]> => {
      const orgId = context.resolveUserOrgID();
      const createdByUserId = context.resolveWhyLabsUserId();
      const members = await Promise.allSettled(
        emails.map(async (email) => {
          try {
            return await addUserToOrg(orgId, email, role ?? undefined, createdByUserId, context);
          } catch (err) {
            logger.error(
              err,
              `Failed to add user with email domain ${extractEmailDomain(email)} and role ${role} to org ${orgId}`,
            );
            return null;
          }
        }),
      );

      return members
        .filter((member): member is PromiseFulfilledResult<Member> => member.status === 'fulfilled' && !!member.value)
        .map((m) => m.value);
    },
    update: async (parent, { email, role }, context): Promise<Member> =>
      updateMember(context.resolveUserOrgID(), email, role, context),
    remove: async (parent, { email }, context): Promise<Member> =>
      removeUserFromOrg(context.resolveUserOrgID(), email, context),
    setDefaultOrganization: async (parent, { orgId }, context): Promise<boolean> => {
      const { email, userId } = context.userContext.membership ?? {};
      if (!email?.length) throw new Error(`User ${userId} is not logged in or does not have a valid email address`);

      return setUserDefaultOrg(orgId, email, context);
    },
    updateEmailDomains: async (parent, { emailDomains }, context): Promise<boolean> => {
      await updateOrganizationEmailDomains(
        context.resolveUserOrgID(),
        arrayToCommaSeparated(emailDomains),
        callOptionsFromGraphqlCxt(context),
      );
      return true;
    },
  },
};

export default resolvers as IResolvers;
