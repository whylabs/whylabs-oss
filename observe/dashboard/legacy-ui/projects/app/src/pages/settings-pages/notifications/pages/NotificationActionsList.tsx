import { WhyLabsLoadingOverlay } from 'components/design-system';

import { useGetGlobalActionsQuery } from 'generated/graphql';
import { useQueryParams } from 'utils/queryUtils';
import { EDITING_KEY } from 'types/navTags';
import { useNewNotificationPageStyles } from '../NewNotificationsPageContentAreaStyles';
import { NotificationActionsTable } from '../components/NotificationActionsTable';
import { useNotificationActionRequestHandler } from '../components/useNotificationActionRequestHandler';
import { NewActionSection } from '../components/actions-list/NewActionSection';
import { NotificationDrawer } from '../components/NotificationDrawer';

export default function NotificationActionsList(): JSX.Element {
  const { data, loading, error, refetch: refetchActionsList } = useGetGlobalActionsQuery();
  const organizationActions = data?.globalActions?.listGlobalActions ?? [];
  const { loadBlocker } = useNotificationActionRequestHandler({});
  const { classes } = useNewNotificationPageStyles();
  const { getQueryParam, setQueryParam } = useQueryParams();
  const editingActionId = getQueryParam(EDITING_KEY);

  const handleClose = () => {
    setQueryParam(EDITING_KEY, null);
  };

  const editingAction = organizationActions?.find(({ id }) => id === editingActionId);
  return (
    <div className={classes.root}>
      <WhyLabsLoadingOverlay visible={loadBlocker} />
      <NewActionSection />
      <NotificationActionsTable data={organizationActions} loading={loading} error={!!error} />
      {!!editingActionId && !loading && (
        <NotificationDrawer
          refetchActions={refetchActionsList}
          isOpened
          handleClose={handleClose}
          actionPrevData={editingAction}
        />
      )}
    </div>
  );
}
