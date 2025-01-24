import { Organization, OrganizationMemberMetadata } from '../../graphql/generated/graphql';
import { getUserOrganization, joinedOrganizations } from '../../graphql/resolvers/helpers/users';
import { authenticatedOrgProcedure, authenticatedProcedure, router } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

const memberships = router({
  list: authenticatedProcedure.query(async ({ ctx }): Promise<OrganizationMemberMetadata[]> => {
    const { userMetadata, auth0UserId } = ctx;
    // we could use the cached memberships in session metadata here... choosing to get the refreshed list enriched
    // with org name as in current UI
    if (!userMetadata?.email || !auth0UserId) return [];
    // only include claimed memberships if the user logged in with claims
    const includeClaims = userMetadata.includeClaims;
    return joinedOrganizations(userMetadata?.email, auth0UserId, includeClaims, callOptionsFromTrpcContext(ctx));
  }),
  describeOrganization: authenticatedOrgProcedure.query(
    async ({ ctx, input: { orgId } }): Promise<Organization | null> => {
      const { defaultOrgId } = ctx.userMetadata ?? {};
      return getUserOrganization(orgId, orgId === defaultOrgId, callOptionsFromTrpcContext(ctx));
    },
  ),
});

export default memberships;
