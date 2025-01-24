import { CurrentUser, MembershipRole, SubscriptionTier } from '~/types/userTypes';

const UNKNOWN_ANALYTICS_VALUE = 'unknown';

type TrackableUser = {
  shouldTrack: true;
  auth0Id: string;
  whyLabsId: string | null;
  email: string;
  role: MembershipRole;
  organization: {
    id: string;
    name: string;
    subscriptionTier: SubscriptionTier;
  };
};

/**
 * Converts the currently logged in user into an analytics/telemetry-friendly version
 * Returns `null` if the user should not be tracked
 * @param user Currently logged in user
 * @param trackImpersonatedUsers If true, impersonated users will be tracked.
 */
export const toTrackableUser = (user: CurrentUser, trackImpersonatedUsers = false): TrackableUser | null => {
  if (!user?.isAuthenticated) {
    // no user to track because they are not logged in
    return null;
  }
  if (!trackImpersonatedUsers && user.metadata?.masquerade?.isActiveNow) {
    // don't track the user if they're being impersonated to avoid polluting customer sessions with WhyLabs activities
    return null;
  }

  return {
    shouldTrack: true,
    auth0Id: user.auth0Id ?? UNKNOWN_ANALYTICS_VALUE,
    whyLabsId: user.whyLabsId ?? null,
    email: user.email ?? UNKNOWN_ANALYTICS_VALUE,
    role: user.role ?? MembershipRole.Unknown,
    organization: {
      id: user.organization?.id ?? UNKNOWN_ANALYTICS_VALUE,
      name: user.organization?.name ?? UNKNOWN_ANALYTICS_VALUE,
      subscriptionTier: user.organization?.subscriptionTier ?? SubscriptionTier.Unknown,
    },
  };
};
