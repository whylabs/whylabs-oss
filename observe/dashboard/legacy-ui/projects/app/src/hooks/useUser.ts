import { ApolloError } from '@apollo/client';
import { useGetUserQuery } from 'generated/graphql';
import { CurrentUser } from 'types/userTypes';
import { canManageActions, canManageDatasets, canManageMonitors, canManageOrg } from 'utils/permissionUtils';
import { isFreeSubscriptionTier } from 'utils/subscriptionUtils';

type UseUserState = {
  loading: boolean;
  error: ApolloError | undefined;
  user: CurrentUser;
  isAuthenticated: boolean;
  isFreeSubscriptionTier: boolean;
  emailVerified: boolean;
  canManageOrg: boolean;
  canManageDatasets: boolean;
  canManageMonitors: boolean;
  canManageActions: boolean;
  isInAWSMarketplace: boolean;
  hasOrg: boolean;
  refetch: () => Promise<unknown>;
};

/**
 * Fetches user state from the backend
 * @param pollInterval How often to check on user state in milliseconds. Defaults to 0 (no polling)
 */
export const useUser = (pollInterval = 0): UseUserState => {
  const { loading, error, data, refetch } = useGetUserQuery({ pollInterval });

  const user = data?.user;
  const organization = user?.organization;

  return {
    loading,
    error,
    user,
    isAuthenticated: !!user?.isAuthenticated,
    isFreeSubscriptionTier: isFreeSubscriptionTier(organization?.subscriptionTier),
    canManageDatasets: canManageDatasets(user),
    canManageOrg: canManageOrg(user),
    canManageMonitors: canManageMonitors(user),
    canManageActions: canManageActions(user),
    isInAWSMarketplace: !!organization?.isAWSMarketplace,
    emailVerified: !!user?.emailVerified,
    refetch,
    hasOrg: !!organization,
  };
};
