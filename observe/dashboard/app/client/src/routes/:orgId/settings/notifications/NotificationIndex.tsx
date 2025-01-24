import { WhyLabsText } from '~/components/design-system';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';

import { getSettingsPageTitle } from '../utils/settingsPageUtils';
import { NotificationActionsTable } from './components/NotificationActionsTable';
import { NotificationDrawer } from './components/NotificationDrawer';
import { useNewNotificationPageStyles } from './notificationStyles';
import { useNotificationsViewModel } from './useNotificationsViewModel';

export const NotificationActionsIndex = (): JSX.Element => {
  useSetHtmlTitle(getSettingsPageTitle('orgIdSettingsNotifications'));

  const viewModel = useNotificationsViewModel();

  const { classes } = useNewNotificationPageStyles();

  return (
    <div className={classes.root}>
      <div className={classes.newActionRoot}>
        <WhyLabsText className={classes.headerText}>
          Notification actions are managed from this page. Actions can be specified in the{' '}
          <pre className={classes.codeLine}>monitor.actions</pre> path of a monitor&apos;s configuration file.
        </WhyLabsText>
      </div>

      <NotificationActionsTable viewModel={viewModel} />

      <NotificationDrawer />
    </div>
  );
};
