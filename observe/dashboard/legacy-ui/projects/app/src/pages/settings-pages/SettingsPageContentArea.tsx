import { Colors } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { GLOBAL_TAB_BAR_HEIGHT, GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import IntegrationImage from 'ui/integrationImage.svg';
import acessTokens from 'ui/acessTokens.svg';
import modelManagment from 'ui/modelManagment.svg';
import notificationManagment from 'ui/notificationAndDigestManagment.svg';
import userManagment from 'ui/userManagment.svg';

import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import SettingsChoiceCard from './settings-card/SettingsChoiceCard';
import { TabContent, useSettingsPageTab } from './SettingsTabBarArea';
import AccessTokenPageContentArea from './access-token-page/AccessTokenContentArea';
import UserSettingsPageContentArea from './user-settings-page/UserSettingsPageContentArea';
import { IntegrationPageContent } from './integration-settings/IntegrationPageContent';
import { getSettingsTabTitle } from './utils/settingsPageUtils';
import { NewNotificationsPageContentArea } from './notifications/NewNotificationsPageContentArea';
import { NewResourceManagementIframe } from './model-settings-page/NewResourceManagementIframe';

const useSettingsContentAreaStyles = createStyles({
  tabContentRoot: {
    backgroundColor: Colors.whiteBackground,
    overflow: 'hidden',
    height: `calc(100vh - ${GLOBAL_TAB_BAR_HEIGHT}px - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
    maxHeight: '100%',
    minHeight: '100%',
  },
  startingRoot: {
    padding: '32px',
    backgroundColor: Colors.brandSecondary100,
    overflow: 'auto',
    height: '100%',
  },
  cardsWrap: {
    display: 'grid',
    gap: 21,
    gridTemplateColumns: `repeat(auto-fit, 250px)`,
    justifyContent: 'center',
    margin: '0 auto',
  },
});

export const SettingsPageStartingContent: React.FC = () => {
  const { classes: styles } = useSettingsContentAreaStyles();
  const { getNavUrl } = useNavLinkHandler();

  useSetHtmlTitle('Settings');

  return (
    <div className={styles.startingRoot}>
      <div className={styles.cardsWrap}>
        <SettingsChoiceCard
          description="Integration setup tool with examples on how to integrate whylogs into your stack"
          src={IntegrationImage}
          title={getSettingsTabTitle('integrationSettings')}
          linkText="Set up a new integration"
          link={getNavUrl({ page: 'settings', settings: { path: 'integrations' } })}
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('modelSettings')}
          description="Create resources to monitor models or datasets in WhyLabs"
          src={modelManagment}
          link={getNavUrl({ page: 'settings', settings: { path: 'model-management' } })}
          linkText="Manage resources"
        />
        <SettingsChoiceCard
          description="Manage notification actions and related monitors"
          title="Global Notifications"
          src={notificationManagment}
          link={getNavUrl({ page: 'settings', settings: { path: 'notifications' } })}
          linkText="Manage notification actions"
        />
        <SettingsChoiceCard
          description="Invite other people on your team to WhyLabs"
          src={userManagment}
          title={getSettingsTabTitle('userSettings')}
          link={getNavUrl({ page: 'settings', settings: { path: 'user-management' } })}
          linkText="Manage users"
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('accessToken')}
          description="Create API access tokens to upload whylogs profiles"
          src={acessTokens}
          link={getNavUrl({ page: 'settings', settings: { path: 'access-tokens' } })}
          linkText="Manage API tokens"
        />
      </div>
    </div>
  );
};

const SettingsPageContentArea: React.FC = () => {
  const { classes: styles } = useSettingsContentAreaStyles();
  const activeTab = useSettingsPageTab();

  const resourceManagementChildren = (() => {
    return <NewResourceManagementIframe />;
  })();

  return (
    <div className={styles.tabContentRoot}>
      <TabContent activeTab={activeTab} tabValue="modelSettings">
        {resourceManagementChildren}
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="accessToken">
        <AccessTokenPageContentArea />
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="notifications">
        <NewNotificationsPageContentArea />
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="userSettings">
        <UserSettingsPageContentArea />
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="integrations">
        <IntegrationPageContent />
      </TabContent>
    </div>
  );
};

export default SettingsPageContentArea;
