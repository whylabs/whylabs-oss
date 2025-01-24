import { WhyLabsBreadCrumbItem } from '~/components/design-system';
import { TabLinkProps } from '~/components/design-system/tab-bar/TabLink';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useOrganizationsList } from '~/hooks/useOrganizationsList';
import { useRouteMatches } from '~/hooks/useRouteMatches';
import { useUserContext } from '~/hooks/useUserContext';
import { SettingsPath, useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { canManageOrg } from '~/utils/permissionUtils';
import { SubscriptionTier } from '~server/graphql/generated/graphql';

import { SettingsRootPagesPathIds, getSettingsTabTitle } from './utils/settingsPageUtils';

export const VALID_BILLING_TIERS: (SubscriptionTier | undefined)[] = [
  SubscriptionTier.Free,
  SubscriptionTier.Subscription,
];

type TabType = Omit<TabLinkProps<SettingsPath>, 'id'>;

export function useSettingsRootViewModel() {
  const { organizationsList, onChangeOrganization, orgId } = useOrganizationsList();
  const { currentUser } = useUserContext();
  const canManageTheOrg = canManageOrg(currentUser);
  const { getNavUrl } = useNavLinkHandler();
  const { isEmbedded } = useIsEmbedded();

  const { currentRoute, latestMatchForIds } = useRouteMatches();

  const parentRoute = latestMatchForIds([
    'orgIdSettingsBilling',
    'orgIdSettingsIntegrations',
    'orgIdSettingsResourceManagement',
    'orgIdSettingsNotifications',
    'orgIdSettingsUserManagement',
    'orgIdSettingsAccessToken',
  ]);

  const routeId = parentRoute?.id ?? currentRoute.id;

  const isIndexPage = currentRoute.id === 'orgIdSettingsIndex';

  const shouldShowBilling = () => {
    return canManageTheOrg && VALID_BILLING_TIERS.includes(currentUser?.organization?.subscriptionTier ?? undefined);
  };

  const activeTab: SettingsPath = (() => {
    switch (routeId) {
      case 'orgIdSettingsBilling':
        return 'billing';
      case 'orgIdSettingsIntegrations':
        return 'integrations';
      case 'orgIdSettingsResourceManagement':
        return 'resource-management';
      case 'orgIdSettingsNotifications':
        return 'notifications';
      case 'orgIdSettingsUserManagement':
        return 'user-management';
      case 'orgIdSettingsAccessToken':
      default:
        return 'access-tokens';
    }
  })();

  const breadCrumbs: WhyLabsBreadCrumbItem[] = (() => {
    if (isIndexPage) return [];

    const { notificationActionId } = currentRoute.params;
    const isEditingNotificationAction = !!notificationActionId;

    const settingsPath = `/${orgId}/${AppRoutePaths.orgIdSettings}`;

    const list: WhyLabsBreadCrumbItem[] = [
      {
        title: 'Settings',
        href: settingsPath,
      },
      {
        title: getSettingsTabTitle(routeId as SettingsRootPagesPathIds),
        href: isEditingNotificationAction ? `${settingsPath}/${AppRoutePaths.orgIdSettingsNotifications}` : undefined,
      },
    ];

    if (isEditingNotificationAction) {
      list.push({
        title: `${notificationActionId} Settings`,
      });
    }

    return list;
  })();

  const getTabUrl = (tab: SettingsPath) => {
    return getNavUrl({ page: 'settings', settings: { path: tab } });
  };

  const tabs = (() => {
    const list: TabType[] = [
      {
        name: getSettingsTabTitle('orgIdSettingsIntegrations'),
        to: getTabUrl('integrations'),
        value: 'integrations',
      },
    ];

    if (canManageTheOrg) {
      list.push({
        name: getSettingsTabTitle('orgIdSettingsResourceManagement'),
        to: getTabUrl('resource-management'),
        value: 'resource-management',
      });

      list.push({
        name: getSettingsTabTitle('orgIdSettingsNotifications'),
        to: getTabUrl('notifications'),
        value: 'notifications',
      });

      list.push({
        name: getSettingsTabTitle('orgIdSettingsUserManagement'),
        to: getTabUrl('user-management'),
        value: 'user-management',
      });

      list.push({
        name: getSettingsTabTitle('orgIdSettingsAccessToken'),
        to: getTabUrl('access-tokens'),
        value: 'access-tokens',
      });
    }

    if (shouldShowBilling()) {
      list.push({
        name: getSettingsTabTitle('orgIdSettingsBilling'),
        to: getTabUrl('billing'),
        value: 'billing',
      });
    }

    return list;
  })();

  return {
    activeTab,
    breadCrumbs,
    isEmbedded,
    isIndexPage,
    onChangeOrganization,
    organizationsList,
    orgId,
    tabs,
  };
}
