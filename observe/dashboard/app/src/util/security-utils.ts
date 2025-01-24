import { SubscriptionTier } from '@whylabs/songbird-node-client';
import { OrganizationSummary, SessionMetadata as WhyLogsSessionMetadata } from '@whylabs/songbird-node-client';
import { OpenIDUser } from 'openid-client';

import { WHYLABS_OIDC_ROLE_KEY, WHYLABS_ORG_ID } from '../constants';
import { sts } from '../providers/aws';
import { WhyLabsAdminRole, checkIsWhyLabsAdmin } from '../services/security/auth0-wrapper';

export const isWhyLabsAdmin = (user?: OpenIDUser | null): boolean => {
  if (!user) return false;
  if (!user.email_verified) return false;
  // checking organization id is not sufficient because users are pinned to WhyLabs org in Sandbox mode
  // have to check something specific to the raw authenticated user rather than their request context
  return !!user[WHYLABS_OIDC_ROLE_KEY]?.some((role) => role === WhyLabsAdminRole);
};

export const isValidWhylogsSession = (
  session: WhyLogsSessionMetadata,
  organization: OrganizationSummary | null,
): boolean => {
  if (
    // need org and user id to establish graphql context
    !session.orgId ||
    !session.userId ||
    // users should not be allowed to create sessions that map to WhyLabs
    session.orgId === WHYLABS_ORG_ID ||
    // users should not be allowed to create sessions that map to anything other than FREE tier orgs
    organization?.subscriptionTier !== SubscriptionTier.Free
  )
    return false;

  return true;
};

let debugModeAllowed: boolean | undefined;
/**
 * We only need to check this once per startup
 * Ensure that the currently logged in user has correct permissions (Auth0 admin role in this case)
 * More or less this: https://pbs.twimg.com/media/D8JmqlyXkAETQlP.jpg
 * Debug mode is meant to be run locally and if you have this source, you can probably just make this return true
 * This is mainly to prevent a deployed version of Dashbird from somehow entering this mode, because horrible things can and will happen
 */
export const ensureCanUseDebugMode = async (): Promise<void> => {
  if (debugModeAllowed == null) {
    const currentAWSUser = await sts.getCallerIdentity({});
    const awsUserEmail = currentAWSUser.UserId?.split(':')?.slice(1)?.pop();
    debugModeAllowed = !!awsUserEmail && (await checkIsWhyLabsAdmin(awsUserEmail));
  }

  if (!debugModeAllowed) {
    throw Error('Currently logged in AWS user is not allowed to access debug mode');
  }
};
