import { Request, Response } from 'express';
import { OpenIDUser } from 'openid-client';

import { SessionMetadata, WhyLabsUserMetadata } from '../../middleware/user-metadata';
import { clearImpersonation } from '../../services/security/auth0-wrapper';
import { getIdentityForImpersonation } from '../../services/security/impersonation-identity-helper';
import { formatAxiosError } from '../../util/logging';
import { GraphQLContext, UserContext, populateGraphQLContext } from '../context';
import { authLogger, getUserContextFromSession } from './user-context';

export type ValidatedImpersonationMetadata = {
  userId: string;
  expiration: number;
};

/**
 * Creates GraphQL context while masquerading as another user, if possible
 * Impersonation request is sent along with the id_token, as part of Auth0 app_metadata
 * In turn, this metadata can be updated directly in Auth0 or via GraphQL (impersonation > impersonate mutation)
 * @param request
 * @param response
 * @param targetOrg
 */
export const tryGetImpersonationContext = async (
  request: Request,
  response: Response,
  targetOrg?: string,
): Promise<GraphQLContext | null> => {
  // WhyLabs employee that is trying to impersonate another user, must be an oidc user and not bypass/token
  const realUser = request.identity?.user as OpenIDUser | undefined;
  if (!realUser) return null;
  const whySession = (request.session ?? {}) as SessionMetadata;
  const impersonatedUserMetadata: WhyLabsUserMetadata | undefined = whySession['userMetadata'];
  const impersonation = response.locals.impersonation;
  if (!(impersonatedUserMetadata && impersonation)) {
    return null;
  }

  try {
    const impersonatedUser = await getIdentityForImpersonation(impersonatedUserMetadata.email);
    const targetContext = await getUserContextFromSession(impersonatedUser, impersonatedUserMetadata, targetOrg);
    const userContext: UserContext = {
      ...targetContext,
      impersonation: {
        enabled: true,
        expiration: impersonation.expiration,
        originalUserId: realUser.sub,
        originalUserEmail: realUser.email,
      },
    };

    authLogger.warn(
      'User %s w/ email %s impersonated user %s from org %s',
      realUser.sub,
      realUser.email,
      impersonation.userId,
      userContext.membership?.orgId,
    );
    if (!userContext) return null;

    return populateGraphQLContext({
      userContext,
      requestTime: Date.now(),
      request,
      response,
    });
  } catch (err) {
    authLogger.warn(
      err,
      formatAxiosError(err) ??
        `Failed to generate impersonation context targeting user ${impersonation.userId}. Request initiated by ${realUser?.sub} - ${realUser?.email}`,
    );
    response.locals.impersonation = undefined;
    await clearImpersonation(realUser.sub);
    return null;
  }
};
