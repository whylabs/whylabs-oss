import * as useUserHook from 'hooks/useUser';

import { CurrentUser } from 'types/userTypes';
import { MembershipRole, Permission, SubscriptionTier } from 'generated/graphql';
import { isFreeSubscriptionTier } from 'utils/subscriptionUtils';
import { canManageActions, canManageDatasets, canManageMonitors, canManageOrg } from 'utils/permissionUtils';
import * as useUserContextFile from 'hooks/useUserContext';

type UseUserContextProps = Omit<
  useUserContextFile.UseUserContextReturnType,
  'isWhyLabsUser' | 'getCurrentUser' | 'userState' | 'canManageDatasets'
> & {
  user: CurrentUser;
};

export function setUseUserContextSpy(props?: Partial<UseUserContextProps>): jest.SpyInstance {
  const mockedProps = mockUseUserContext(props);
  const user = mockedProps.getCurrentUser();
  const organization = user?.organization;

  jest.spyOn(useUserHook, 'useUser').mockReturnValue({
    ...mockedProps,
    user,
    isAuthenticated: !!user?.isAuthenticated,
    isFreeSubscriptionTier: isFreeSubscriptionTier(organization?.subscriptionTier),
    canManageDatasets: canManageDatasets(user),
    canManageOrg: canManageOrg(user),
    canManageMonitors: canManageMonitors(user),
    canManageActions: canManageActions(user),
    isInAWSMarketplace: !!organization?.isAWSMarketplace,
    emailVerified: !!user?.emailVerified,
    refetch: jest.fn(),
    hasOrg: !!organization,
  });

  return jest.spyOn(useUserContextFile, 'useUserContext').mockReturnValue(mockedProps);
}

export function mockUseUserContext(custom?: Partial<UseUserContextProps>): useUserContextFile.UseUserContextReturnType {
  const user = custom?.user
    ? {
        ...custom.user,
        metadata: { masquerade: { isActiveNow: true } }, // Simulate impersonate to avoid tracking in tests
      }
    : null;
  return {
    logout: jest.fn(),
    isWhyLabsUser: () => !!user?.email?.endsWith('@whylabs.ai'),
    getCurrentUser: () => user,
    userState: { user },
    loading: false,
    error: undefined,
    canManageDatasets: user?.permissions?.includes(Permission.ManageDatasets) ?? false,
    ...custom,
  };
}

export function getMockedUser(custom: Partial<CurrentUser> = {}): CurrentUser {
  return {
    name: 'Bob Bobberson',
    auth0Id: 'auth0|376a1a4a-1868-4ccf-b1ab-5c88a5bac601',
    whyLabsId: 'user-376a1a4a-1868-4ccf-b1ab-5c88a5bac601',
    isAuthenticated: true,
    role: MembershipRole.Member,
    permissions: [Permission.ViewData],
    email: 'bob@whylabs.ai',
    emailVerified: true,
    organization: {
      id: 'org-test',
      name: 'Test Org',
      subscriptionTier: SubscriptionTier.Free,
      isAWSMarketplace: false,
    },
    ...custom,
  };
}
