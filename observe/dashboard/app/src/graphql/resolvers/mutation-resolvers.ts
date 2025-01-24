import { IResolvers } from '@graphql-tools/utils';

import { AWS_MARKETPLACE_HEADER_TOKEN_NAME, UNKNOWN_METADATA_VALUE } from '../../constants';
import { getLogger } from '../../providers/logger';
import { executeAndRecordAdminAction } from '../../services/data/audit-logs/audit-log-service';
import { submitFeedback } from '../../services/data/slack-message/feedback';
import { AnonymousFeedback, IdentifiableFeedback } from '../../services/data/slack-message/feedback-slack-blocks';
import { submitSecureForm } from '../../services/data/slack-message/llm-secure-form';
import { SecureFormPayload } from '../../services/data/slack-message/secure-form-slack-blocks';
import {
  getOrganization,
  provisionAWSMarketplaceOrganization,
  provisionOrganization,
} from '../../services/data/songbird/api-wrappers/organizations';
import { getUserByEmail } from '../../services/data/songbird/api-wrappers/users';
import { clearImpersonation } from '../../services/security/auth0-wrapper';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { FullGraphQLContext } from '../context';
import {
  AccessTokenManagement,
  AdHocMonitorMutations,
  BackfillAnalyzersMutations,
  GlobalActionsManagement,
  ModelManagement,
  NotificationManagement,
  OrgCustomTagsManagement,
  Resolvers,
} from '../generated/graphql';

const logger = getLogger('MutationLogger');

const resolvers: Resolvers<FullGraphQLContext> = {
  Mutation: {
    submitSecureForm: async (parent, args, context): Promise<boolean> => {
      const {
        form: { fullName, phone, contactEmail, datasetId },
      } = args;
      const orgId = context.resolveUserOrgID();
      const orgMetadata = await getOrganization(orgId, callOptionsFromGraphqlCxt(context));
      const orgName = orgMetadata?.name ?? UNKNOWN_METADATA_VALUE;

      const { originalUserEmail } = context.userContext.impersonation ?? {};
      const { userId, email } = context.userContext.membership ?? {};
      const { name } = context.userContext.auth0User ?? {};

      try {
        const formPayload: SecureFormPayload = {
          orgId,
          orgName,
          userId: userId ?? UNKNOWN_METADATA_VALUE,
          userEmail: email ?? UNKNOWN_METADATA_VALUE,
          userName: name ?? UNKNOWN_METADATA_VALUE,
          impersonatedBy: originalUserEmail ?? null,
          fullName,
          phone,
          contactEmail,
          datasetId,
        };

        logger.debug('Submitting %s secure form for org %s', orgId);
        await submitSecureForm(formPayload);
        return true;
      } catch (err) {
        logger.error(err, 'Failed to submit secure form for org %s', orgId);
        return false;
      }
    },
    submitFeedback: async (parent, args, context): Promise<boolean> => {
      const { submitAnonymously, feedback } = args;
      const { message, tags, component, featureName, datasetId, category, trackID, url } = feedback;
      const orgId = context.resolveUserOrgID();
      const orgMetadata = await getOrganization(orgId, callOptionsFromGraphqlCxt(context));
      const orgName = orgMetadata?.name ?? UNKNOWN_METADATA_VALUE;
      const { originalUserEmail } = context.userContext.impersonation ?? {};
      const { name } = context.userContext.auth0User ?? {};

      const anonymousFeedback: AnonymousFeedback = {
        orgId,
        orgName,
        userId: null,
        userName: null,
        userEmail: null,
        component,
        category,
        tags,
        featureName,
        datasetId,
        message,
        impersonatedBy: originalUserEmail ?? null,
        trackID,
        url,
      };

      try {
        const { userId, email } = context.userContext.membership ?? {};
        const finalizedFeedback: AnonymousFeedback | IdentifiableFeedback = submitAnonymously
          ? anonymousFeedback
          : {
              ...anonymousFeedback,
              userId: userId ?? UNKNOWN_METADATA_VALUE,
              userEmail: email ?? UNKNOWN_METADATA_VALUE,
              userName: name ?? UNKNOWN_METADATA_VALUE,
            };

        logger.debug(
          'Submitting %s feedback for org %s trackId %s',
          submitAnonymously ? 'anonymous' : 'identifiable',
          orgId,
          trackID,
        );
        await submitFeedback(finalizedFeedback);
        return true;
      } catch (err) {
        logger.error(err, 'Failed to submit feedback for org %s', orgId);
        return false;
      }
    },
    claimSession: async (): Promise<boolean> => {
      return false;
    },
    provisionOrganization: async (parent, { orgName, modelName }, context): Promise<boolean> => {
      const { userContext, request } = context;
      const { email, email_verified, sub: auth0ID } = userContext.auth0User ?? {};
      const customerAWSToken = request.cookies[AWS_MARKETPLACE_HEADER_TOKEN_NAME];

      if (!email || !auth0ID || !email_verified)
        throw new Error(
          `User not logged in or has an invalid or unverified email: ${email} or id: ${auth0ID}. Email verified: ${email_verified}`,
        );
      const options = callOptionsFromGraphqlCxt(context);

      if (customerAWSToken) {
        if (typeof customerAWSToken !== 'string') {
          throw new Error(`Unexpected value in place of the customer id token: ${customerAWSToken}`);
        }
        // If we have a customer token present then we assume this request was generated from an AWS marketplace registration
        const orgNameToUse = orgName ?? `AWS Marketplace Organization`;
        const modelNameToUse = modelName ?? `My Model`;

        try {
          const { customerId, orgId } = await provisionAWSMarketplaceOrganization(
            orgNameToUse,
            modelNameToUse,
            email,
            auth0ID,
            customerAWSToken,
            options,
          );

          logger.info(
            'Successfully provisioned AWS marketplace organization %s for user %s, customer id %s',
            orgId,
            auth0ID,
            customerId,
          );

          context.response.clearCookie(AWS_MARKETPLACE_HEADER_TOKEN_NAME);
          return true;
        } catch (e) {
          logger.error(e, `Error provisioning aws marketplace org`);
          throw e;
        }
      } else {
        const orgNameToUse = orgName ?? `My Organization`;
        const modelNameToUse = modelName ?? `My Model`;

        // check if user already exists
        const user = await getUserByEmail(email, options);
        const userExists = !!user;

        logger.info('Provisioning org %s for user %s', orgNameToUse, auth0ID);
        const { orgId } = await provisionOrganization(
          orgNameToUse,
          modelNameToUse,
          email,
          auth0ID,
          userExists,
          options,
        );
        logger.info('Successfully provisioned organization %s for user %s', orgId, auth0ID);
        return true;
      }
    },
    setFalseAlarm: async (parent, args, context) => {
      const orgId = context.resolveUserOrgID();
      const isFalseAlarm = args.isFalseAlarm === undefined || args.isFalseAlarm === null ? true : args.isFalseAlarm;
      try {
        await context.dataSources.dataService.setFalseAlarm(
          {
            orgId,
            analysisId: args.alertId,
            isUnhelpful: isFalseAlarm,
          },
          callOptionsFromGraphqlCxt(context),
        );
        return true;
      } catch (e) {
        logger.error(e, `Couldn't set false alarm for org ${orgId} anomaly ${args.alertId} to ${isFalseAlarm}`);
        return false;
      }
    },
    clearImpersonation: async (parent, args, context): Promise<boolean> =>
      executeAndRecordAdminAction(
        context,
        async () => {
          context.request.session = {
            userMetadata: undefined, // force cookie to be reset
          };
          return clearImpersonation(context.userContext.impersonation?.originalUserId);
        },
        `Clear impersonation. Impersonated user ${context.userContext.membership?.userId} in org ${context.userContext.membership?.orgId}`,
      ),
    // cast to silence tslint errors for missing property definitions - type-specific resolvers actually implement these in their respective files
    accessToken: () => ({} as AccessTokenManagement),
    models: () => ({} as ModelManagement),
    notificationManagement: () => ({} as NotificationManagement),
    globalActions: () => ({} as GlobalActionsManagement),
    organizationCustomTags: () => ({} as OrgCustomTagsManagement),
    admin: () => ({}),
    impersonation: () => ({}),
    monitorSettings: () => ({}),
    memberships: () => ({}),
    preferences: () => ({}),
    emailVerification: () => ({}),
    adHocMonitor: () => ({} as AdHocMonitorMutations),
    backfillAnalyzers: () => ({} as BackfillAnalyzersMutations),
  },
};

export default resolvers as IResolvers;
