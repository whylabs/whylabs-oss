/* eslint-disable no-underscore-dangle */

import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Navigate } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { EDITING_KEY } from 'types/navTags';

import { useState } from 'react';
import { useFindGlobalActionQuery } from 'generated/graphql';
import { FETCHING_ERROR_MESSAGE } from 'ui/constants';
import { Group } from '@mantine/core';
import {
  SkeletonGroup,
  WhyLabsButton,
  WhyLabsLoadingOverlay,
  WhyLabsModal,
  WhyLabsText,
  WhyLabsTypography,
} from 'components/design-system';
import { useQueryParams } from 'utils/queryUtils';
import { useNewNotificationPageStyles } from '../NewNotificationsPageContentAreaStyles';
import { ActionHeaderControls } from '../components/action-details/ActionHeaderControls';
import { ACTION_TYPES, extractExtraWebhookFieldsFromPayload, translateHeaderEntriesToMap } from '../globalActionUtils';
import { NotificationActionsTable } from '../components/NotificationActionsTable';
import { useNotificationActionRequestHandler } from '../components/useNotificationActionRequestHandler';
import { RelatedMonitorsSection } from '../components/action-details/RelatedMonitorsSection';
import { NotificationDrawer } from '../components/NotificationDrawer';

export const NotificationActionDetails: React.FC = () => {
  const { actionType, modelId, passedId } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const { classes, cx } = useNewNotificationPageStyles();
  const { setQueryParam, getQueryParam } = useQueryParams();
  const editState = !!getQueryParam(EDITING_KEY);
  const actionsList = getNavUrl({ modelId, page: 'settings', settings: { path: 'notifications' } });
  const { data, loading, error, refetch } = useFindGlobalActionQuery({ variables: { id: passedId } });
  const actionDetails = data?.globalActions.findGlobalAction;
  const { handleNavigation } = useNavLinkHandler();
  const actionNotFound = !loading && !actionDetails;
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const actionOption = ACTION_TYPES.find(({ type }) => type === actionDetails?.type);
  const { loadBlocker, deleteAction } = useNotificationActionRequestHandler({
    refetch,
  });
  if (!ACTION_TYPES.find(({ routePath }) => actionType === routePath)) return <Navigate to={actionsList} />;

  const navigateBack = () => handleNavigation({ page: 'settings', settings: { path: 'notifications' } });
  const defaultWebhookFields = extractExtraWebhookFieldsFromPayload(actionDetails?.payload);

  const handleDelete = async (confirmed: boolean) => {
    if (!confirmed) {
      setDeleteModal(true);
      return;
    }
    const success = await deleteAction(actionDetails?.id ?? '');
    if (success) {
      navigateBack();
    } else {
      setDeleteModal(false);
    }
  };

  const handleClose = () => {
    setQueryParam(EDITING_KEY, null);
  };

  const handleEditState = (edit: boolean) => {
    setQueryParam(EDITING_KEY, edit.toString());
  };

  const webhookPropsText = (() => {
    if (actionDetails?.payload?.__typename !== 'CustomWebhookAction') return '';
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
      console.error(e, 'Failed to convert webhook payload', JSON.stringify(actionDetails));
      return '';
    }
  })();

  const renderCustomWebhookSection = () => {
    if (actionType !== 'webhook') return null;
    if (loading)
      return (
        <div>
          <SkeletonGroup count={1} width={150} height={20} mt={5} />
          <SkeletonGroup count={1} width={800} height={250} mt={5} />
        </div>
      );
    return (
      defaultWebhookFields && (
        <div>
          <WhyLabsText className={classes.webhookPropertiesLabel}>Webhook properties</WhyLabsText>
          <pre className={cx(classes.codeTextArea, classes.detailsTextArea)}>{webhookPropsText}</pre>
        </div>
      )
    );
  };

  return (
    <div className={classes.root}>
      <WhyLabsLoadingOverlay visible={loadBlocker} />
      <ActionHeaderControls
        handleEditState={handleEditState}
        editMode={editState}
        actionOption={actionOption}
        handleDelete={handleDelete}
        loading={loading}
        isEnabled={!!actionDetails?.enabled}
      />
      {error && actionNotFound ? (
        <div className={classes.tableEmptyState}>{FETCHING_ERROR_MESSAGE}</div>
      ) : (
        <NotificationActionsTable
          data={actionDetails ? [actionDetails] : []}
          loading={loading}
          error={!!error}
          actionOption={actionOption}
          hideActionsCell
          isDetailsTable
          refetch={refetch}
        />
      )}
      {renderCustomWebhookSection()}
      <RelatedMonitorsSection data={actionDetails} loading={loading} />
      <WhyLabsModal title="Delete notification action" opened={deleteModal} onClose={() => setDeleteModal(false)}>
        <div>
          <WhyLabsTypography order={5}>
            You really want to delete <strong>&apos;{actionDetails?.id ?? ''}&apos;</strong> notification action?
          </WhyLabsTypography>
          <Group position="right" mt={16}>
            <WhyLabsButton variant="outline" color="gray" onClick={() => setDeleteModal(false)}>
              Cancel
            </WhyLabsButton>
            <WhyLabsButton variant="outline" color="danger" onClick={() => handleDelete(true)}>
              Delete
            </WhyLabsButton>
          </Group>
        </div>
      </WhyLabsModal>
      {editState && actionDetails && (
        <NotificationDrawer
          refetchActions={refetch}
          isOpened
          handleClose={handleClose}
          actionPrevData={actionDetails}
        />
      )}
    </div>
  );
};
