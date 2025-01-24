import { createStyles } from '@mantine/core';
import accessTokensIcon from '~/assets/accessTokens.svg';
import { Colors } from '~/assets/Colors';
import creditCardSvg from '~/assets/credit-card-icon.svg';
import integrationImage from '~/assets/integrationImage.svg';
import modelManagement from '~/assets/modelManagement.svg';
import notifications from '~/assets/notificationAndDigestManagement.svg';
import userManagement from '~/assets/userManagement.svg';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { useUserContext } from '~/hooks/useUserContext';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { VALID_BILLING_TIERS } from '~/routes/:orgId/settings/useSettingsRootViewModel';
import { canManageOrg } from '~/utils/permissionUtils';
import { JSX } from 'react';

import { SettingsChoiceCard } from './components/SettingsChoiceCard';
import { getSettingsTabTitle } from './utils/settingsPageUtils';

const useStyles = createStyles({
  root: {
    backgroundColor: Colors.brandSecondary100,
    height: '100%',
    padding: 32,
    overflow: 'auto',
  },
  cardsWrap: {
    display: 'grid',
    gap: 21,
    gridTemplateColumns: `repeat(auto-fit, 250px)`,
    justifyContent: 'center',
    margin: '0 auto',
  },
});

export const SettingsIndex = (): JSX.Element => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { currentUser: user } = useUserContext();
  const userCanManageOrg = canManageOrg(user);
  useSetHtmlTitle('Settings');

  return (
    <div className={classes.root}>
      <div className={classes.cardsWrap}>
        <SettingsChoiceCard
          title={getSettingsTabTitle('orgIdSettingsIntegrations')}
          description="Integration setup tool with examples on how to integrate whylogs into your stack"
          src={integrationImage}
          link={getNavUrl({ page: 'settings', settings: { path: 'integrations' } })}
          linkText="Set up a new integration"
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('orgIdSettingsResourceManagement')}
          description="Create resources to monitor models or datasets in WhyLabs"
          src={modelManagement}
          link={getNavUrl({ page: 'settings', settings: { path: 'resource-management' } })}
          linkText="Manage resources"
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('orgIdSettingsNotifications')}
          description="Manage notification actions and related monitors"
          src={notifications}
          link={getNavUrl({ page: 'settings', settings: { path: 'notifications' } })}
          linkText="Manage notification actions"
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('orgIdSettingsUserManagement')}
          description="Invite other people on your team to WhyLabs"
          src={userManagement}
          link={getNavUrl({ page: 'settings', settings: { path: 'user-management' } })}
          linkText="Manage users"
        />
        <SettingsChoiceCard
          title={getSettingsTabTitle('orgIdSettingsAccessToken')}
          description="Create API access tokens to upload whylogs profiles"
          src={accessTokensIcon}
          link={getNavUrl({ page: 'settings', settings: { path: 'access-tokens' } })}
          linkText="Manage API tokens"
        />
        {userCanManageOrg && VALID_BILLING_TIERS.includes(user?.organization?.subscriptionTier ?? undefined) && (
          <SettingsChoiceCard
            description="Manage your billing settings"
            src={creditCardSvg}
            title={getSettingsTabTitle('orgIdSettingsBilling')}
            link={getNavUrl({ page: 'settings', settings: { path: 'billing' } })}
            linkText="Manage subscription"
          />
        )}
      </div>
    </div>
  );
};
