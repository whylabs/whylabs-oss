import { SkeletonGroup, WhyLabsConfirmationDialog, WhyLabsText } from '~/components/design-system';
import { ActionType } from '~server/graphql/generated/graphql';
import LogRocket from 'logrocket';

import { ActionHeaderControls } from './components/action-details/ActionHeaderControls';
import { RelatedMonitorsSection } from './components/action-details/RelatedMonitorsSection';
import { NotificationActionsTable } from './components/NotificationActionsTable';
import { NotificationDrawer } from './components/NotificationDrawer';
import { useNewNotificationPageStyles } from './notificationStyles';
import { useNotificationsViewModel } from './useNotificationsViewModel';
import { extractExtraWebhookFieldsFromPayload, translateHeaderEntriesToMap } from './utils/globalActionUtils';

export const NotificationActionDetails = () => {
  const viewModel = useNotificationsViewModel();
  const {
    actionDetails,
    actionNotFound,
    editingActionId,
    fetchingErrorMessage,
    handleDelete,
    isDeleteModelOpen,
    isLoading,
    listingNotificationsError,
    onCancelDeletingModel,
  } = viewModel;

  const { classes, cx } = useNewNotificationPageStyles();

  const defaultWebhookFields = extractExtraWebhookFieldsFromPayload(actionDetails);

  const webhookPropsText = (() => {
    if (actionDetails?.type !== 'WEBHOOK' || !actionDetails.payload) return '';

    if ('url' in actionDetails.payload) {
      const { body, headers, method, url } = actionDetails?.payload ?? {};

      try {
        const config = JSON.stringify(
          {
            url,
            method,
            body: !body ? null : body,
            headers: translateHeaderEntriesToMap(headers ?? []),
          },
          null,
          4,
        );
        return config.replace('"body": null,', '"body": null, // WhyLabs will send a default message');
      } catch (e) {
        LogRocket.error(e, 'Failed to convert webhook payload', JSON.stringify(actionDetails));
        return '';
      }
    }

    return '';
  })();

  const renderCustomWebhookSection = () => {
    if (!actionDetails || actionDetails.type !== ActionType.Webhook) return null;

    if (isLoading) {
      return (
        <div>
          <SkeletonGroup count={1} width={150} height={20} mt={5} />
          <SkeletonGroup count={1} width={800} height={250} mt={5} />
        </div>
      );
    }

    if (defaultWebhookFields) {
      return (
        <div>
          <WhyLabsText className={classes.webhookPropertiesLabel}>Webhook properties</WhyLabsText>
          <pre className={cx(classes.codeTextArea, classes.detailsTextArea)}>{webhookPropsText}</pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={classes.detailsRoot}>
      <ActionHeaderControls viewModel={viewModel} />
      {listingNotificationsError && actionNotFound ? (
        <div className={classes.tableEmptyState}>{fetchingErrorMessage}</div>
      ) : (
        <NotificationActionsTable isDetailsTable viewModel={viewModel} />
      )}
      {renderCustomWebhookSection()}
      <RelatedMonitorsSection />
      <WhyLabsConfirmationDialog
        closeButtonText="Cancel"
        confirmButtonText="Delete"
        dialogTitle="Delete notification action"
        isOpen={isDeleteModelOpen}
        modalSize="500px"
        onClose={onCancelDeletingModel}
        onConfirm={() => handleDelete(true)}
      >
        <WhyLabsText>
          You really want to delete <strong>&apos;{actionDetails?.id ?? ''}&apos;</strong> notification action?
        </WhyLabsText>
      </WhyLabsConfirmationDialog>
      {editingActionId && actionDetails && <NotificationDrawer />}
    </div>
  );
};
