import { IResolvers } from '@graphql-tools/utils';

import { getLogger } from '../../providers/logger';
import { getUserById } from '../../services/data/songbird/api-wrappers/memberships';
import { updateUser } from '../../services/data/songbird/api-wrappers/users';
import { getAuth0User, resendAuth0EmailVerification } from '../../services/security/auth0-wrapper';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { FullGraphQLContext } from '../context';
import { OrganizationMemberMetadata, Resolvers, UserPreferences } from '../generated/graphql';
import { getUserOrganization, joinedOrganizations } from './helpers/users';

const logger = getLogger('UserResolversLogger');

const resolvers: Resolvers<FullGraphQLContext> = {
  User: {
    organization: async (parent, args, context) => {
      const { userContext } = context;
      return getUserOrganization(
        userContext.membership?.orgId,
        userContext.membership?.default ?? false,
        callOptionsFromGraphqlCxt(context),
      );
    },
    emailVerified: async (parent, args, context): Promise<boolean> => !!context.userContext.auth0User?.email_verified,
    auth0EmailVerified: async (parent, args, context): Promise<boolean | null> => {
      const { auth0User } = context.userContext;
      if (!auth0User) return null;

      /**
       * This allows double checking email verification status in Auth0,
       * if the email is not verified in request session context.
       * It is not possible for email verification status to switch to unverified,
       * so it's safe to default to what's in the session, if it's already verified there.
       *
       * Because of auth0 rate limits, this field should only be used when waiting for the email verification
       * during user registration.
       */
      return (
        auth0User.email_verified ||
        getAuth0User(auth0User.sub)
          .then((u) => !!u?.email_verified)
          .catch((err) => {
            logger.error(err, 'Failed to look up user %s in Auth0', auth0User.sub);
            return null;
          })
      );
    },
    joinedOrganizations: async (parent, _, context): Promise<OrganizationMemberMetadata[]> => {
      const { email, emailVerified, auth0Id } = parent;

      if (!email || !emailVerified || !auth0Id) return [];
      // only include memberships from claims if the user logged in with claims
      const includeClaims = context.userContext.includeClaims;
      return joinedOrganizations(email, auth0Id, includeClaims, callOptionsFromGraphqlCxt(context));
    },
    preferences: async (parent, args, context): Promise<UserPreferences | null> => {
      const user = await getUserById(context.resolveWhyLabsUserId(), callOptionsFromGraphqlCxt(context));
      const { preferences } = user ?? {};
      if (!preferences) return null;

      return JSON.parse(preferences);
    },
  },
  PreferencesManagement: {
    update: async (parent, { newPreferences }, context): Promise<boolean> => {
      const userId = context.resolveWhyLabsUserId();
      const callOptions = callOptionsFromGraphqlCxt(context);
      const user = await getUserById(userId, callOptions);
      if (!user) {
        throw Error(`Could not find currently logged in user ${userId}`);
      }
      await updateUser({ ...user, preferences: JSON.stringify(newPreferences) }, callOptions);
      return true;
    },
  },
  EmailVerificationManagement: {
    resendVerificationEmail: async (parent, args, { userContext }): Promise<boolean> => {
      const auth0Id = userContext.auth0User?.sub;
      if (!auth0Id) {
        throw Error('User not logged in, cannot send verification email.');
      }
      const auth0User = await getAuth0User(auth0Id);
      if (auth0User?.email_verified) {
        throw Error(`Cannot send verification email for user ${auth0Id}: email already verified`);
      }

      await resendAuth0EmailVerification(auth0Id);
      return true;
    },
  },
};

export default resolvers as IResolvers;
