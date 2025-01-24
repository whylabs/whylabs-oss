import { SubscriptionTier } from '@whylabs/songbird-node-client';
import { z } from 'zod';

import { gqlToRole, membershipToGQL } from '../../graphql/contract-converters/songbird/membership-converter';
import { MembershipRole } from '../../graphql/generated/graphql';
import {
  createMembership,
  getMembershipsByOrg,
  removeMembershipByEmail,
  updateMembershipByEmail,
} from '../../services/data/songbird/api-wrappers/memberships';
import {
  createOrganizationWithDefaults,
  getAWSMarketplaceMetadata,
  getOrganization,
  getOrganizations,
} from '../../services/data/songbird/api-wrappers/organizations';
import { createUser, getUserByEmail } from '../../services/data/songbird/api-wrappers/users';
import { logger } from '../../services/data/songbird/api-wrappers/utils';
import { CallOptions } from '../../util/async-helpers';
import { extractEmailDomain } from '../../util/misc';
import { validateEmail } from '../../util/validation';
import { router, whylabsAdminProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

const OrgListingResponseLastModified = 0;
const ONE_MINUTE_IN_MILLIS = 60 * 1000;

const userInputSchema = z.object({
  email: z.string(),
  role: z.nativeEnum(MembershipRole),
  orgId: z.string(),
});

const getOrganizationMembers = async (orgId: string, options: CallOptions) => {
  const memberships = await getMembershipsByOrg(orgId, true, options);
  return Array.from(memberships).map((m) => membershipToGQL(m, m.email));
};

// I have secured these with whylabsAdminProcedure because they involve access to arbitrary orgs.
export const organizations = router({
  list: whylabsAdminProcedure.query(async ({ ctx }) => {
    if (OrgListingResponseLastModified < Date.now() - ONE_MINUTE_IN_MILLIS) {
      return getOrganizations(callOptionsFromTrpcContext(ctx));
    }
    return [];
  }),
  create: whylabsAdminProcedure
    .input(z.object({ name: z.string().max(64), tier: z.nativeEnum(SubscriptionTier) }))
    .mutation(({ ctx, input }) => {
      return createOrganizationWithDefaults(input.name, input.tier, callOptionsFromTrpcContext(ctx));
    }),
  describe: whylabsAdminProcedure.input(z.object({ id: z.string().max(128) })).query(({ ctx, input }) => {
    return getOrganization(input.id, callOptionsFromTrpcContext(ctx));
  }),
  getAWSMarketplaceMetadata: whylabsAdminProcedure
    .input(z.object({ id: z.string().max(32) }))
    .query(({ ctx, input }) => {
      return getAWSMarketplaceMetadata(input.id, callOptionsFromTrpcContext(ctx));
    }),
  getMembers: whylabsAdminProcedure.input(z.object({ id: z.string().max(32) })).query(({ ctx, input }) => {
    return getOrganizationMembers(input.id, callOptionsFromTrpcContext(ctx)) ?? [];
  }),
  updateMember: whylabsAdminProcedure
    .input(userInputSchema)
    .mutation(async ({ ctx, input: { email, orgId, role } }) => {
      const emailDomain = extractEmailDomain(email);
      logger.info('Updating member with email domain %s to role %s in org %s', emailDomain, role, orgId);

      const options = callOptionsFromTrpcContext(ctx);

      const membership = await updateMembershipByEmail(orgId, email, gqlToRole(role), options);

      logger.info('Successfully updated membership for userID %s to role %s in org %s', membership.userId, role, orgId);
      return membershipToGQL(membership, email);
    }),
  addMemberToOrganization: whylabsAdminProcedure
    .input(userInputSchema)
    .mutation(async ({ ctx, input: { email, orgId, role } }) => {
      validateEmail(email);

      const options = callOptionsFromTrpcContext(ctx);
      const emailDomain = extractEmailDomain(email);

      logger.info('Adding user with email domain %s and role %s to org %s', emailDomain, role, orgId);

      const user = (await getUserByEmail(email, options)) ?? (await createUser(email, options));
      const membership = await createMembership(orgId, user.userId, user.email, gqlToRole(role), '', options);

      logger.info(
        'Created membership for the specified user with email domain %s. UserID: %s',
        emailDomain,
        user.userId,
      );
      return membershipToGQL(membership, user.email);
    }),
  removeMemberFromOrganization: whylabsAdminProcedure
    .input(userInputSchema.omit({ role: true }))
    .mutation(async ({ ctx, input }) => {
      const emailDomain = extractEmailDomain(input.email);

      logger.info('Removing user with email domain %s from org %s', emailDomain, input.orgId);

      const options = callOptionsFromTrpcContext(ctx);
      const user = await getUserByEmail(input.email, options);
      if (!user?.userId) {
        return { email: input.email, orgId: input.orgId, role: MembershipRole.Unknown, userId: '' };
      }
      const userId = user?.userId;

      await removeMembershipByEmail(input.orgId, input.email, userId, options);

      logger.info('User with email domain %s successfully removed from org %s', emailDomain, input.orgId);
      return { userId, orgId: input.orgId, email: input.email, role: MembershipRole.Unknown };
    }),
});
