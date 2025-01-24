import { IResolvers } from '@graphql-tools/utils';

import {
  getOrganizationCustomTagsConfig,
  getResourceTagsInUse,
  listOrganizationCustomTags,
  updateOrganizationCustomTagsConfig,
  validateOrganizationCustomTagsConfig,
} from '../../services/data/data-service/api-wrappers/resource-tagging';
import { getMembershipsByOrg } from '../../services/data/songbird/api-wrappers/memberships';
import { getOrganization } from '../../services/data/songbird/api-wrappers/organizations';
import { CallOptions, callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { fnThrow } from '../../util/misc';
import { FullGraphQLContext } from '../context';
import { membershipToGQL } from '../contract-converters/songbird/membership-converter';
import { Member, NotificationSettings, Resolvers } from '../generated/graphql';

const getOrganizationMembers = async (orgId: string, options: CallOptions): Promise<Member[]> => {
  // default to including claims for max visibility of users with potential access
  const memberships = await getMembershipsByOrg(orgId, true, options);
  return Array.from(memberships).map((m) => membershipToGQL(m, m.email));
};

const resolvers: Resolvers<FullGraphQLContext> = {
  Organization: {
    members: async (parent, context) =>
      getOrganizationMembers(
        parent.id ?? fnThrow('Invalid org id, cannot list members'),
        callOptionsFromGraphqlCxt(context),
      ),
    notifications: async (parent, args, context): Promise<NotificationSettings | null> => {
      // this should technically be the id of the org we're looking at (parent),
      // but that breaks our security assumption that users are unable to query data for arbitrary orgs
      const orgId = context.resolveUserOrgID();
      const org = await getOrganization(orgId, callOptionsFromGraphqlCxt(context));
      if (!org) {
        throw Error('Organization does not exist');
      }

      return { ...parent.notifications };
    },
    resourceTagsConfig: async (parent, context) =>
      getOrganizationCustomTagsConfig(
        parent.id ?? fnThrow('Invalid org id, cannot get tags config'),
        callOptionsFromGraphqlCxt(context),
      ),
    availableResourceTags: async (parent, context) =>
      listOrganizationCustomTags(
        parent.id ?? fnThrow('Invalid org id, cannot get tags config'),
        callOptionsFromGraphqlCxt(context),
      ),
    resourceTagsInUse: async (parent, context) =>
      getResourceTagsInUse(
        parent.id ?? fnThrow('Invalid org id, cannot get tags config'),
        callOptionsFromGraphqlCxt(context),
      ),
  },
  OrgCustomTagsManagement: {
    validateYamlConfigChanges: async (_, { yaml }, context) =>
      validateOrganizationCustomTagsConfig(context.resolveUserOrgID(), yaml, callOptionsFromGraphqlCxt(context)),
    updateYamlConfig: async (_, { yaml }, context) =>
      updateOrganizationCustomTagsConfig(context.resolveUserOrgID(), yaml, callOptionsFromGraphqlCxt(context)),
  },
};

export default resolvers as IResolvers;
