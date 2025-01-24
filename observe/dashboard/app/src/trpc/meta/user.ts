import { z } from 'zod';

import { getRoleOrWhyLabPermissions } from '../../graphql/authz/rules/authorization';
import { roleToGQL } from '../../graphql/contract-converters/songbird/membership-converter';
import { Masquerade, MembershipRole, Organization, Permission } from '../../graphql/generated/graphql';
import { getUserOrganization } from '../../graphql/resolvers/helpers/users';
import { clearImpersonation } from '../../services/security/auth0-wrapper';
import { toHumanReadableTime } from '../../util/time';
import { authenticatedProcedure, router } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

export type User = {
  auth0Id: string | undefined;
  email: string | undefined;
  name: string | undefined;
  isAuthenticated: boolean;
  metadata?: {
    masquerade?: Masquerade;
  };
  organization: Organization | null;
  permissions?: Array<Permission>;
  defaultOrganization: string | null;
  role: MembershipRole;
  whyLabsId: string | undefined;
};

export const user = router({
  clearImpersonation: authenticatedProcedure.mutation(async ({ ctx }) => {
    await clearImpersonation(ctx.auth0UserId);
  }),
  getCurrentUser: authenticatedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input: { orgId } }): Promise<User> => {
      const { userMetadata, impersonation, auth0UserId } = ctx;
      const usedOrgId = orgId ?? userMetadata?.defaultOrgId;
      const membership = ctx.userMetadata?.memberships?.find((m) => m.orgId === usedOrgId);
      const organization = usedOrgId
        ? await getUserOrganization(
            usedOrgId,
            membership?.orgId === userMetadata?.defaultOrgId,
            callOptionsFromTrpcContext(ctx),
          )
        : null;
      const defaultOrganization = userMetadata?.defaultOrgId ?? null;
      const masquerade: Masquerade | undefined = impersonation?.userId
        ? {
            expiration: impersonation?.expiration ? toHumanReadableTime(impersonation.expiration) : undefined,
            isActiveNow: !!impersonation?.userId,
          }
        : undefined;
      // Be aware of what is being sent to the client here
      // This endpoint is mainly used to send metadata to Log rocket on client-side
      return {
        auth0Id: auth0UserId,
        defaultOrganization,
        email: userMetadata?.email,
        name: userMetadata?.name,
        isAuthenticated: !!auth0UserId && !!userMetadata,
        organization,
        permissions: getRoleOrWhyLabPermissions(membership?.role, !!userMetadata?.whylabsAdmin),
        metadata: { masquerade },
        role: membership ? roleToGQL(membership.role) : MembershipRole.Unknown,
        whyLabsId: userMetadata?.userId,
      };
    }),
});
