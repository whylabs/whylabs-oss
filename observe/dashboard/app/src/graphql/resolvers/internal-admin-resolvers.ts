import { IResolvers } from '@graphql-tools/utils';
import { SubscriptionTier, TimePeriod } from '@whylabs/songbird-node-client';

import { serviceUrl } from '../../config';
import { executeAndRecordAdminAction } from '../../services/data/audit-logs/audit-log-service';
import { clearMaintenanceBanner, updateMaintenanceBanner } from '../../services/data/maintenance-status';
import {
  getMembershipsByEmail,
  getMembershipsByUserId,
  getUserById,
  removeMembershipByEmail,
} from '../../services/data/songbird/api-wrappers/memberships';
import {
  createOrganization,
  getOrganization,
  getOrganizations,
  updateOrganizationEmailDomains,
  updateOrganizationSubscriptionTier,
} from '../../services/data/songbird/api-wrappers/organizations';
import { createModel, getModels } from '../../services/data/songbird/api-wrappers/resources';
import { getUserByEmail } from '../../services/data/songbird/api-wrappers/users';
import { getAuth0User, updateAuth0UserMetadata } from '../../services/security/auth0-wrapper';
import { getIdentityForImpersonation } from '../../services/security/impersonation-identity-helper';
import { callOptionsFromGraphqlCxt, runAll } from '../../util/async-helpers';
import { arrayToCommaSeparated } from '../../util/contract-utils';
import { extractEmailDomain, sanitizeSearchString } from '../../util/misc';
import { validatePaginationLimit } from '../../util/validation';
import { FullGraphQLContext } from '../context';
import { membershipToGQL } from '../contract-converters/songbird/membership-converter';
import { gqlAssetTypeToContract, modelMetadataToModel } from '../contract-converters/songbird/model-converters';
import {
  contractOrganizationToGQL,
  graphqlSubscriptionTierToContract,
} from '../contract-converters/songbird/organization-converter';
import {
  InternalGlobalManagement,
  InternalMembershipManagement,
  InternalModelManagement,
  InternalOrganizationManagement,
  InternalOrganizationUpdate,
  Member,
  Model,
  Organization,
  Resolvers,
} from '../generated/graphql';
import { addUserToOrg, removeUserFromOrg, setUserDefaultOrg, updateMember } from './membership-resolvers';

const MAX_ALLOWED_IMPERSONATION_DURATION_MINUTES = 8 * 60; // 8 hours

const searchFields = (fields: (string | undefined | null)[], searchString?: string | null): boolean => {
  if (!searchString) return true;
  const lowerCaseSearchString = searchString?.toLocaleLowerCase();
  return fields.some((field) => field?.toLocaleLowerCase().includes(lowerCaseSearchString));
};

const resolvers: Resolvers<FullGraphQLContext> = {
  InternalAdminInfo: {
    organization: async (parent, { orgId }, context): Promise<Organization | null> =>
      executeAndRecordAdminAction(
        context,
        () =>
          getOrganization(orgId, callOptionsFromGraphqlCxt(context)).then(
            (org) => org && contractOrganizationToGQL(org),
          ),
        `Fetch metadata for org ${orgId}`,
      ),
    organizations: async (parent, args, context): Promise<Organization[]> => {
      const { search, limit } = args;
      validatePaginationLimit(limit);
      return executeAndRecordAdminAction(
        context,
        async () => {
          const organizations = await getOrganizations(callOptionsFromGraphqlCxt(context));
          const filteredOrganizations = search
            ? organizations.filter((org) =>
                searchFields([org.id, org.name, org.emailDomains, org.subscriptionTier], search),
              )
            : organizations;

          // TODO: paginate/limit songbird results BEFORE they get to Dashbird
          return filteredOrganizations.slice(0, limit).map((it) => contractOrganizationToGQL(it));
        },
        `List organization metadata with filter ${search}`,
      );
    },
    models: async (parent, { orgId, search }, context): Promise<Model[]> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          const models = (await getModels(orgId, callOptionsFromGraphqlCxt(context))).map(modelMetadataToModel);
          return search ? models.filter((m) => searchFields([m.id, m.name], search)) : models;
        },
        `List models for org ${orgId} with filter ${search}`,
      ),
    memberships: async (parent, { email: searchString }, context): Promise<Member[]> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          const options = callOptionsFromGraphqlCxt(context);
          const getUserByAuth0Id = async (emailOrId: string) => {
            const auth0User = await getAuth0User(emailOrId, false);
            const auth0Email = auth0User?.email;
            return auth0Email ? getUserByEmail(auth0Email, options) : null;
          };

          // search across whylabs and auth0 users
          // only one of these calls should return results, depending on whether email, whylabs id, or auth0 id was provided
          const searchResults = await runAll(
            getUserByEmail(searchString, options),
            getUserById(searchString, options),
            getUserByAuth0Id(searchString),
          );

          // grab the first user result found
          const user = searchResults.successes.find((u) => !!u);

          if (!user) {
            return [];
          }
          // include claimed memberships even though they may not be current, for maximum visibility
          return (await getMembershipsByUserId(user.userId, true, options)).map((m) => membershipToGQL(m, user.email));
        },
        `List memberships for a user. Search string: ${sanitizeSearchString(searchString)}`,
      ),
    checkAuth0Verified: async (parent, args, context): Promise<boolean> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          const auth0User = await getIdentityForImpersonation(args.email);
          return !!auth0User?.email_verified;
        },
        `Check if user ${args.email} is verified in Auth0`,
      ),
  },
  PlatformAdministration: {
    organizations: () => ({} as InternalOrganizationManagement),
    organization: (parent, { orgId }) => ({ orgId } as InternalOrganizationUpdate),
    models: () => ({} as InternalModelManagement),
    memberships: () => ({} as InternalMembershipManagement),
    global: () => ({} as InternalGlobalManagement),
  },
  InternalOrganizationManagement: {
    create: async (parent, { name, emailDomains }, context): Promise<Organization> =>
      executeAndRecordAdminAction(
        context,
        async () =>
          contractOrganizationToGQL(
            await createOrganization(
              name,
              SubscriptionTier.Paid,
              serviceUrl,
              arrayToCommaSeparated(emailDomains ?? undefined),
              callOptionsFromGraphqlCxt(context),
            ),
          ),
        `Create organization with name ${name}, domains ${emailDomains}`,
      ),
  },
  InternalOrganizationUpdate: {
    orgId: String,
    updateEmailDomains: async (parent, { emailDomains }, context): Promise<Organization> =>
      executeAndRecordAdminAction(
        context,
        async () =>
          contractOrganizationToGQL(
            await updateOrganizationEmailDomains(
              parent.orgId,
              arrayToCommaSeparated(emailDomains),
              callOptionsFromGraphqlCxt(context),
            ),
          ),
        `Update email domains to ${emailDomains} for organization ${parent.orgId}`,
      ),
    updateSubscriptionTier: async (parent, { subscriptionTier }, context): Promise<Organization> =>
      executeAndRecordAdminAction(
        context,
        async () =>
          contractOrganizationToGQL(
            await updateOrganizationSubscriptionTier(
              parent.orgId,
              graphqlSubscriptionTierToContract(subscriptionTier),
              callOptionsFromGraphqlCxt(context),
            ),
          ),
        `Update subscription tier to ${subscriptionTier} for organization ${parent.orgId}`,
      ),
  },
  InternalModelManagement: {
    create: async (parent, { orgId, name, type }, context): Promise<Model> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          const model = await createModel(
            orgId,
            name,
            TimePeriod.P1D,
            gqlAssetTypeToContract(type),
            undefined,
            callOptionsFromGraphqlCxt(context),
          );
          return modelMetadataToModel(model);
        },
        `Create model for org ${orgId}, name ${name} of type ${type}`,
      ),
  },
  InternalMembershipManagement: {
    clear: async (parent, { email }, context): Promise<boolean> => {
      const options = callOptionsFromGraphqlCxt(context);
      return executeAndRecordAdminAction(
        context,
        async () => {
          const memberships = await getMembershipsByEmail(email, true, options);
          await Promise.all(memberships.map((m) => removeMembershipByEmail(m.orgId, m.email, m.userId), options));

          return true;
        },
        `Clear memberships for user with email domain ${extractEmailDomain(email)}`,
      );
    },
    add: async (parent, { orgId, email, role }, context) =>
      executeAndRecordAdminAction(
        context,
        () => addUserToOrg(orgId, email, role ?? undefined, context.resolveWhyLabsUserId(), context),
        `Add user with email domain ${extractEmailDomain(email)} to org ${orgId}`,
      ),
    update: async (parent, { orgId, email, role }, context) =>
      executeAndRecordAdminAction(
        context,
        () => updateMember(orgId, email, role, context),
        `Update user role with email domain ${extractEmailDomain(email)} to ${role} in org ${orgId}`,
      ),
    remove: async (parent, { orgId, email }, context) =>
      executeAndRecordAdminAction(
        context,
        () => removeUserFromOrg(orgId, email, context),
        `Remove user with email domain ${extractEmailDomain(email)} from org ${orgId}`,
      ),
    setDefaultOrg: async (parent, { orgId, email }, context) =>
      executeAndRecordAdminAction(
        context,
        () => setUserDefaultOrg(orgId, email, context),
        `Set user with email domain ${extractEmailDomain(email)} to log in to org ${orgId} by default`,
      ),
  },
  InternalImpersonationManagement: {
    impersonate: async (parent, { userId, durationMinutes }, context): Promise<boolean> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          if (durationMinutes > MAX_ALLOWED_IMPERSONATION_DURATION_MINUTES) {
            throw Error(
              `Impersonation duration of ${durationMinutes} exceeds the maximum allowed duration of ${MAX_ALLOWED_IMPERSONATION_DURATION_MINUTES}`,
            );
          }
          if (context.userContext.impersonation?.originalUserId) {
            throw Error(
              `Existing impersonation data found in your session info - please try logging out if refresh does not work`,
            );
          }

          if (!context.userContext.auth0User) {
            throw Error(`No user information found in your session info - please log in`);
          }

          const user = await getUserById(userId, callOptionsFromGraphqlCxt(context));
          if (!user) {
            throw Error(`Cannot impersonate user ${userId}: user does not exist in WhyLabs.`);
          }
          const impersonation = { userId, expiration: context.requestTime + durationMinutes * 60 * 1000 };
          await updateAuth0UserMetadata(context.userContext.auth0User.sub, {
            impersonation,
          });
          return true;
        },
        `Impersonate user ${userId}`,
      ),
  },
  InternalGlobalManagement: {
    updateMaintenanceBanner: async (_, { message }, context): Promise<boolean> =>
      executeAndRecordAdminAction(
        context,
        () => updateMaintenanceBanner(message, context.resolveUserEmail()).then(() => true),
        `Update maintenance banner with: ${message}`,
      ),
    clearMaintenanceBanner: async (_, __, context): Promise<boolean> =>
      executeAndRecordAdminAction(context, () => clearMaintenanceBanner().then(() => true), 'Clear maintenance banner'),
  },
};

export default resolvers as IResolvers;
