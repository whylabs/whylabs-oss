import { NextFunction, Request, Response } from 'express';
import { OpenIDUser } from 'openid-client';

import { IDENTITY_REQUEST_KEY, WHYLABS_OIDC_WHYLABS_ROLE_MAPPING } from '../constants';
import { ValidatedImpersonationMetadata } from '../graphql/authz/impersonation-context';
import { authLogger } from '../graphql/authz/user-context';
import { getLogger } from '../providers/logger';
import { updateMembershipsFromClaims } from '../services/data/songbird/api-wrappers/memberships';
import { WhyLabsCallContext, defaultCallOptions } from '../util/async-helpers';
import { isWhyLabsAdmin } from '../util/security-utils';
import {
  SessionMetadata,
  WhyLabsUserMetadata,
  establishImpersonatedUserMetadata,
  establishMetadataFromOpenIDUser,
  establishUserMetadata,
  metadataNeedsRefreshing,
} from './user-metadata';

const logger = getLogger('SessionMetadataLogger');

/**
 * Check if the session metadata is still valid and current. If not, refresh it.
 * @returns updated session metadata or null if the user is not yet authenticated
 * @throws ForbiddenError if the user is not allowed to impersonate - caller should clear session if this happens
 */
const _checkOrRefresh = async (req: Request, res: Response): Promise<SessionMetadata | null> => {
  // See extractAuth0Context for how identity is constructed for each type of auth
  const identity = req[IDENTITY_REQUEST_KEY];
  const realUser = (identity?.user as OpenIDUser) ?? undefined;
  const callContext: WhyLabsCallContext = {
    auth0UserId: realUser?.sub,
    auditOrigIp: req.ip,
    operationContext: { name: 'checkOrRefreshSessionMetadata' },
  };
  // note if the identity is token-based, the session cookie probably won't be available and we'll just retrieve the metadata
  const whySession = req.session ?? {};
  const userMetadata: WhyLabsUserMetadata = whySession['userMetadata'];
  const impersonation: ValidatedImpersonationMetadata | undefined = res.locals.impersonation;

  if (!realUser) {
    return null;
  }

  if (!realUser.sub || !realUser.email) {
    logger.warn('Skip updating metadata because the identity is invalid');
    return null;
  }

  const includeClaims = !!realUser[WHYLABS_OIDC_WHYLABS_ROLE_MAPPING];

  // user's email must be verified for us to map their email to an org, but we do still need to setup their metadata
  // note the email verified status may get out of date, which is why UI needs to monitor the auth0EmailVerified status
  // in this case
  if (!realUser.email_verified) {
    authLogger.info("User's email is not verified, cannot pin organization. User: %s", realUser.sub);
    const userMetadata = establishMetadataFromOpenIDUser(realUser);
    if (!userMetadata) {
      return null;
    }
    return { userMetadata };
  }

  // refresh the membership metadata every one minute, or if it is inconsistent
  if (!metadataNeedsRefreshing(userMetadata, realUser, impersonation)) {
    logger.debug(userMetadata, 'Session metadata in good shape. Skip checking with backend');
    return { userMetadata };
  }

  // Need to refresh the metadata
  logger.debug(userMetadata, 'Refreshing metadata');

  // check some basic detail about the real user
  const whylabsAdmin = isWhyLabsAdmin(realUser);

  // check the impersonation metadata, if any
  if (impersonation) {
    // we're impersonating, so need to construct the impersonated user's metadata
    const userMetadata = await establishImpersonatedUserMetadata(
      realUser.sub,
      realUser.email,
      impersonation,
      callContext,
    );
    return userMetadata ? { userMetadata } : null;
  } else {
    // not impersonating, so construct the real user's metadata
    // if the user has role claims, update memberships based on those claims
    await updateMembershipsFromClaims(realUser, {
      ...defaultCallOptions,
      context: { auth0UserId: realUser.sub, operationContext: { name: 'refreshSessionMetadata' } },
    });
    const userMetadata = await establishUserMetadata(realUser, whylabsAdmin, includeClaims, callContext);
    if (!userMetadata) {
      return null;
    }
    return { userMetadata };
  }
};

export const checkOrRefreshSessionMetadata = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const setEmptySession = () => {
    req.session = {
      userMetadata: undefined,
    };
    next();
  };
  // get special info for debug prod and impersonation
  const debugUserId = process.env.DEBUG_USER_ID;

  try {
    const refreshedMetadata = await _checkOrRefresh(req, res);
    if (!refreshedMetadata) {
      return setEmptySession();
    }
    if (debugUserId) {
      authLogger.warn('[DEBUG MODE]: Logging into user %s', debugUserId);
    }
    req.session = refreshedMetadata;
    next();
  } catch (err) {
    next(err);
  }
};
