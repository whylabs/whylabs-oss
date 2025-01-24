import { Membership, Role, SubscriptionTier } from '@whylabs/songbird-node-client';

import { getMembershipsByEmail } from '../../../services/data/songbird/api-wrappers/memberships';
import { getAWSMarketplaceMetadata, getOrganization } from '../../../services/data/songbird/api-wrappers/organizations';
import { CallOptions } from '../../../util/async-helpers';
import { DEMO_ORG_ID } from '../../authz/user-context';
import { roleToGQL } from '../../contract-converters/songbird/membership-converter';
import { contractOrganizationToGQL } from '../../contract-converters/songbird/organization-converter';
import { MembershipType, Organization, OrganizationMemberMetadata } from '../../generated/graphql';

/**
 * Determines membership type for a membership or organization
 * @param orgId Org that the user is logged into or has access to
 * @param isDefault Whether the org is set as default via Memberships
 * @param demoOrgId ID of the demo org, if configured in the current environment
 */
export const getMembershipType = (orgId: string, isDefault?: boolean, demoOrgId?: string): MembershipType => {
  if (orgId === demoOrgId) return MembershipType.Demo;

  if (isDefault) return MembershipType.Default;

  return MembershipType.Member;
};

/**
 * Gets the organizations the user is allowed access to, including implied ones.
 * @param email user's email
 * @param auth0Id users auth0 identity (just for demo and anon session, but beware its not whylabs id)
 * @param includeClaims set true only if the user login is claims-based
 * @param callOptions
 * @returns  OrganizationMemberMetadata[] for organizations the user has access to
 */
export const allUserMemberships = async (
  email: string,
  auth0Id: string | undefined,
  includeClaims: boolean,
  callOptions: CallOptions,
): Promise<Membership[]> => {
  if (!auth0Id) return [];
  const memberships: Membership[] = [];
  Array.prototype.push.apply(memberships, await getMembershipsByEmail(email, includeClaims, callOptions));

  // add the demo org to the list, if the flag is enabled and demo org is configured and not already in memberships
  if (DEMO_ORG_ID) {
    if (!memberships.find((m) => m.orgId === DEMO_ORG_ID)) {
      memberships.push({
        userId: auth0Id,
        email,
        role: Role.Viewer,
        orgId: DEMO_ORG_ID,
      });
    }
  }

  return memberships;
};

/**
 * In user-display contexts, we need the org name as part of the membership info
 * @param memberships
 * @param options
 */
export const enrichMemberships = async (
  memberships: Membership[],
  options: CallOptions,
): Promise<OrganizationMemberMetadata[]> => {
  // map through the memberships to add things like org name to them (they only contain IDs by default) - useful to the front end
  // TODO: we may want to move this to Songbird (something like getOrgsByEmail),
  //  although this should be fine unless someone abuses the membership feature to become a member of thousands of orgs
  const orgs: (OrganizationMemberMetadata | null)[] = await Promise.all(
    Array.from(memberships).map(async (m) => {
      const org = await getOrganization(m.orgId, options);
      if (!org?.name) return null;

      const meta: OrganizationMemberMetadata = {
        orgId: m.orgId,
        name: org.name,
        role: roleToGQL(m.role),
        membershipType: getMembershipType(m.orgId, m.default, DEMO_ORG_ID),
      };
      return meta;
    }),
  );

  // only include orgs that exist
  return orgs.filter((org): org is OrganizationMemberMetadata => !!org);
};

export const joinedOrganizations = async (
  email: string,
  auth0Id: string | undefined,
  includeClaims: boolean,
  options: CallOptions,
): Promise<OrganizationMemberMetadata[]> => {
  if (!auth0Id) return [];
  const memberships = await allUserMemberships(email, auth0Id, includeClaims, options);
  return enrichMemberships(memberships, options);
};

export const getUserOrganization = async (
  orgId: string | undefined,
  defaultMembership: boolean,
  options: CallOptions,
): Promise<Organization | null> => {
  // get latest org metadata, since the one in context may be cached/outdated
  const orgMetadata = orgId ? await getOrganization(orgId, options) : null;

  // Only call to get marketplace metadata if the org is a marketplace org. Otherwise just assume its null.
  const marketplaceMetadata =
    orgId && orgMetadata?.subscriptionTier === SubscriptionTier.AwsMarketplace
      ? await getAWSMarketplaceMetadata(orgId)
      : null;
  return orgMetadata
    ? {
        ...contractOrganizationToGQL(orgMetadata, marketplaceMetadata),
        membershipType: getMembershipType(orgMetadata.id, defaultMembership, DEMO_ORG_ID),
        // anonymousSession is deprecated
        anonymousSession: {
          enabled: false,
          valid: false,
        },
      }
    : null;
};
