import { Membership, Role } from '@whylabs/songbird-node-client';
import { Request, Response } from 'express';
import { OpenIDUser } from 'openid-client';

import { config } from '../../config';
import { IDENTITY_REQUEST_KEY } from '../../constants';
import { ForbiddenError, InvalidOrganizationError } from '../../errors/dashbird-error';
import { ipIsAllowed } from '../../middleware/ip-allow-list';
import { WhyLabsUserMetadata } from '../../middleware/user-metadata';
import { getLogger } from '../../providers/logger';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { extractEmailDomain } from '../../util/misc';
import { GraphQLContext, UserContext, populateGraphQLContext } from '../context';
import { MembershipType } from '../generated/graphql';
import { getRoleOrWhyLabPermissions } from './rules/authorization';

export const authLogger = getLogger('AuthLogger', { includeHeaders: true });

type IdentityType = 'oidc' | 'token' | 'bypass' | 'debug';

export type OIDCIdentity = {
  user: OpenIDUser;
  source: IdentityType;
};

export const DEMO_ORG_ID = config.demos?.demoOrgId;

export const createDemoOrgMembership = (userId: string, email: string, demoOrgId: string): Membership => ({
  userId,
  email,
  role: Role.Viewer,
  orgId: demoOrgId,
});
/**
 * Attempts to assign the user to the specified org, if they have permission to access it
 * @param userMetadata
 * @param targetOrg Organization to target
 */
const getMembershipForTargetOrg = (
  userMetadata: WhyLabsUserMetadata,
  targetOrg: MembershipType | string,
): Membership => {
  authLogger.debug(`Pinning user ${userMetadata.userId} to target org ${targetOrg}`);

  // we also allow targeting the demo org by its membership type (alias) "demo"
  // if the user did request the "demo" org, resolve this to the corresponding orgId here
  const targetOrDemoOrgId =
    targetOrg.toLocaleLowerCase() === MembershipType.Demo.toLocaleLowerCase() ? DEMO_ORG_ID : targetOrg;

  const matchingMembership = userMetadata.memberships.find((m) => m.orgId === targetOrDemoOrgId);

  // special flow when targeting the demo organization, because users do not have an explicit membership in it
  if (!matchingMembership && targetOrDemoOrgId === DEMO_ORG_ID) {
    if (!DEMO_ORG_ID) {
      authLogger.warn(
        `User ${userMetadata.userId} attempted to log in to the demo org, but it is not configured in the current environment.`,
      );
      throw new InvalidOrganizationError(targetOrg);
    }
    authLogger.info(
      `Pinned user ${userMetadata.userId} from email domain ${extractEmailDomain(
        userMetadata.email,
      )} to demo org ${DEMO_ORG_ID}`,
    );
    // create a phantom membership for the duration of the request
    return createDemoOrgMembership(userMetadata.userId, userMetadata.email, DEMO_ORG_ID);
  }

  if (!matchingMembership) {
    authLogger.warn(`User ${userMetadata.userId} attempted to log in to org ${targetOrg}, but is not a member of it.`);
    throw new InvalidOrganizationError(targetOrg);
  }

  if (!(matchingMembership.role && matchingMembership.orgId)) {
    authLogger.warn(`Invalid membership data in metadata for ${userMetadata.userId} org ${targetOrg}`);
    throw new InvalidOrganizationError(targetOrg);
  }

  authLogger.info(
    `Pinned user ${userMetadata.userId} from email domain ${extractEmailDomain(
      userMetadata.email,
    )} to org ${targetOrg}`,
  );
  return {
    orgId: matchingMembership.orgId,
    role: matchingMembership.role,
    userId: userMetadata.userId,
    email: userMetadata.email,
    default: userMetadata.defaultOrgId === matchingMembership.orgId,
  };
};

/**
 * Gets default membership context for the user
 * @param userMetadata
 */
const getDefaultMembership = (userMetadata: WhyLabsUserMetadata): Membership | null => {
  const defaultOrgId = userMetadata.defaultOrgId ?? userMetadata.memberships[0]?.orgId;
  if (defaultOrgId === undefined) {
    // may happen during onboarding flow when user has no memberships yet
    return null;
  }

  const matchingMembership = userMetadata.memberships.find((m) => m.orgId === defaultOrgId);

  if (!(matchingMembership && matchingMembership.role && matchingMembership.orgId)) {
    authLogger.warn(`Invalid default membership data in metadata for ${userMetadata.userId} org ${defaultOrgId}`);
    throw new InvalidOrganizationError(defaultOrgId ?? 'none');
  }

  authLogger.info(
    `Pinned user ${userMetadata.userId} from email domain ${extractEmailDomain(
      userMetadata.email,
    )} by email to default org ${defaultOrgId}`,
  );
  return {
    orgId: matchingMembership.orgId,
    role: matchingMembership.role,
    userId: userMetadata.userId,
    email: userMetadata.email,
    default: true,
  };
};

/**
 * Establishes which organization and user metadata the request is going to be associated with
 * @param user
 * @param userMetadata
 * @param targetOrg Desired organization, if present in the request
 */
export const getUserContextFromSession = async (
  user: OpenIDUser, // need this to be a partial
  userMetadata: WhyLabsUserMetadata,
  targetOrg?: string,
): Promise<UserContext> => {
  const defaultContext: UserContext = {
    auth0User: user,
    includeClaims: false, // would need the conn name too or get it when needed
    membership: null,
    permissions: [],
  };

  // if the target org was specified, attempt to find a matching membership
  // otherwise use the default membership
  const membership: Membership | null = targetOrg
    ? getMembershipForTargetOrg(userMetadata, targetOrg)
    : getDefaultMembership(userMetadata);

  if (!membership) {
    return defaultContext;
  }
  return {
    ...defaultContext,
    includeClaims: userMetadata.includeClaims,
    membership,
    permissions: getRoleOrWhyLabPermissions(membership.role, userMetadata.whylabsAdmin),
  };
};

/**
 * Runs through the standard authN/authZ flows to establish permissions and memberships for the caller
 * @param request Request containing OpenID user context (e.g. from Auth0)
 * @param response Service response
 * @param targetOrg Organization to target. Will use user's default membership, if not provided.
 */
export const getUserContext = async (
  request: Request,
  response: Response,
  targetOrg?: string,
): Promise<GraphQLContext> => {
  const identity = request[IDENTITY_REQUEST_KEY];
  const emptyContext = populateGraphQLContext({
    userContext: {
      auth0User: null,
      membership: null,
      includeClaims: false,
      permissions: [],
    },
    requestTime: Date.now(),
    request,
    response,
  });
  if (!identity) {
    authLogger.info('User not logged in, returning empty context');
    return populateGraphQLContext(emptyContext);
  }
  const whySession = request.session ?? {};
  const userMetadata: WhyLabsUserMetadata = whySession['userMetadata'];
  if (!userMetadata) {
    return emptyContext;
  }
  const userContext = await getUserContextFromSession(identity.user, userMetadata, targetOrg);
  const { membership } = userContext ?? {};
  authLogger.info(
    'Established user %s (whylabs user %s) org to be %s',
    identity.user.sub,
    membership?.userId,
    membership?.orgId,
  );

  // The following would be better as middleware, but would need to factor out the targetOrg logic
  if (!request.ip) {
    authLogger.error(`No IP address available for client request from user ${identity.user.sub}`);
    return emptyContext;
  }
  const graphqlContext = populateGraphQLContext({
    userContext,
    requestTime: Date.now(),
    request,
    response,
  });
  if (
    await ipIsAllowed(
      request.ip,
      membership?.orgId,
      callOptionsFromGraphqlCxt(graphqlContext),
      ` - x-forwarded-for header is ${request.header('x-forwarded-for')} and forwarded header is ${request.header(
        'forwarded',
      )}`,
    )
  ) {
    return graphqlContext;
  }

  throw new ForbiddenError(`IP address not allowed for organization ${membership?.orgId}`);
};
