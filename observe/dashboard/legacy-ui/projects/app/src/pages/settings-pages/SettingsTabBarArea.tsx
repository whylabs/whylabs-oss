import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageType } from 'pages/page-types/usePageType';
import { createTabBarComponents } from '@whylabs/observatory-lib';
import { useUserContext } from 'hooks/useUserContext';
import { canManageOrg } from 'utils/permissionUtils';
import { DefaultTabBarArea } from 'components/layout/DefaultTabBarArea';
import OrganizationSelect from 'pages/resource-overview-page/components/OrganizationSelect';
import { getSettingsTabTitle } from './utils/settingsPageUtils';

export type SettingsTabBarAreaTypes =
  | 'accessToken'
  | 'modelSettings'
  | 'notifications'
  | 'userSettings'
  | 'integrations';

const { TabBarArea, TabLink, TabContent: TabContentComponent } = createTabBarComponents<SettingsTabBarAreaTypes>();
export const TabContent = TabContentComponent;

export function useSettingsPageTab(): SettingsTabBarAreaTypes {
  const pt = usePageType();
  switch (pt) {
    case 'notifications':
    case 'notificationAction':
      return 'notifications';
    case 'accessToken':
      return 'accessToken';
    case 'modelSettings':
      return 'modelSettings';
    case 'userSettings':
      return 'userSettings';
    case 'integrationSettings':
      return 'integrations';
    default:
      return 'accessToken';
  }
}

export const SettingsTabBarAreaBlank = (): JSX.Element => {
  return <DefaultTabBarArea preTitleChildren={<OrganizationSelect />} title="Settings" />;
};

const SettingsTabBarArea = (): JSX.Element => {
  const { getNavUrl } = useNavLinkHandler();
  const pt = usePageType();
  const activeTab = useSettingsPageTab();
  const { getCurrentUser } = useUserContext();
  const canManageTheOrg = canManageOrg(getCurrentUser());

  return (
    <DefaultTabBarArea preTitleChildren={<OrganizationSelect />} title={getSettingsTabTitle(pt)}>
      <TabBarArea activeTab={activeTab}>
        <TabLink
          value="integrations"
          to={getNavUrl({ page: 'settings', settings: { path: 'integrations' } })}
          name={getSettingsTabTitle('integrationSettings')}
        />
        {canManageTheOrg && (
          <TabLink
            value="modelSettings"
            to={getNavUrl({ page: 'settings', settings: { path: 'model-management' } })}
            name={getSettingsTabTitle('modelSettings')}
          />
        )}
        {canManageTheOrg && (
          <TabLink
            value="notifications"
            to={getNavUrl({ page: 'settings', settings: { path: 'notifications' } })}
            name={getSettingsTabTitle('notifications')}
          />
        )}
        {canManageTheOrg && (
          <TabLink
            value="userSettings"
            to={getNavUrl({ page: 'settings', settings: { path: 'user-management' } })}
            name={getSettingsTabTitle('userSettings')}
          />
        )}
        {canManageTheOrg && (
          <TabLink
            value="accessToken"
            to={getNavUrl({ page: 'settings', settings: { path: 'access-tokens' } })}
            name={getSettingsTabTitle('accessToken')}
          />
        )}
      </TabBarArea>
    </DefaultTabBarArea>
  );
};

export default SettingsTabBarArea;
