import { createStyles } from '@mantine/core';
import { IconClipboardCopy, IconPlus } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  WhyLabsButton,
  WhyLabsConfirmationDialog,
  WhyLabsEditableText,
  WhyLabsSubmitButton,
  WhyLabsText,
} from '~/components/design-system';
import { useFlags } from '~/hooks/useFlags';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { DashboardDateRangeBadge } from '~/routes/:orgId/dashboard/components/custom-dashboard/utils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import LogRocket from 'logrocket';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useDashboardIdLayoutContext } from '../layout/DashboardIdLayout';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
  editableTitle: {
    padding: '6px 20px',
    paddingRight: '6px',
    maxWidth: 'max(40%, 400px)',
  },
  buttonGroup: {
    alignItems: 'center',
    padding: '6px 8px',
    display: 'flex',
    gap: 5,
  },
  badgeWrapper: {
    paddingRight: 8,
  },
  saveButton: {
    padding: '0px 18px',
    fontSize: 14,
  },
  copyButton: {
    fontWeight: 'normal',
    padding: '0px 9px 0px 9px',
    color: Colors.secondaryLight1000,
  },
  flex: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    paddingTop: 15,
  },
}));

export const CustomDashboardHeaderControls = (): JSX.Element => {
  const { classes } = useStyles();
  const { dashboardId } = useParams();
  const viewModel = useDashboardIdLayoutContext();
  const {
    displayName,
    displayNameOnChangeHandler,
    hasUnsavedChanges,
    isDemoOrg,
    isEmbeddedIntoCustomContext,
    saveDashboardDisplayName,
    createWidgetDrawerState,
  } = viewModel;
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const flags = useFlags();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleCopyURL = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        enqueueSnackbar({ title: 'URL copied to clipboard!' });
      })
      .catch((error) => {
        LogRocket.error('Failed to copy URL to clipboard:', error);
      });
  };

  const toggleDeleteDialog = () => {
    setIsDeleteDialogOpen((prevState) => !prevState);
  };

  const disabledSaveTooltip = (() => {
    if (isDemoOrg) return 'Dashboard cannot be saved to the demo org';
    if (viewModel.membershipRole?.isViewer) return 'Dashboard cannot be saved by a viewer';
    return '';
  })();

  const dashboardDateRange = viewModel.getRangeConfig();

  const dashboardMutationAllowed = isDemoOrg === false && viewModel?.membershipRole?.isViewer === false;
  const shouldEnableCopyButton = dashboardId !== AppRoutePaths.create && !isEmbeddedIntoCustomContext;
  const shouldEnableDeleteButton = dashboardMutationAllowed && isEmbeddedIntoCustomContext;

  const saveButton = (() => {
    const commonProps = {
      className: classes.saveButton,
      disabled: !hasUnsavedChanges || viewModel.membershipRole?.isViewer || !!isDemoOrg,
      disabledTooltip: disabledSaveTooltip,
      loading: viewModel.isSaving || !viewModel.membershipRole || isDemoOrg === null,
      onClick: viewModel.onSaveDashboard,
      size: 'xs',
    };

    // If the dashboard is embedded into a custom context it should be the primary gradient button
    if (isEmbeddedIntoCustomContext) {
      return (
        <WhyLabsButton variant="outline" {...commonProps}>
          Save changes
        </WhyLabsButton>
      );
    }

    return <WhyLabsSubmitButton {...commonProps}>Save changes</WhyLabsSubmitButton>;
  })();

  return (
    <>
      <div className={classes.root}>
        <div className={classes.flex}>
          <WhyLabsEditableText
            className={classes.editableTitle}
            defaultEmptyValue="Unnamed Dashboard"
            label="Dashboard Name"
            onChange={displayNameOnChangeHandler}
            onSave={saveDashboardDisplayName}
            value={displayName}
          />
        </div>
        <div className={classes.buttonGroup}>
          {dashboardDateRange && (
            <div className={classes.badgeWrapper}>
              <DashboardDateRangeBadge dateRange={dashboardDateRange} rangeLabel />
            </div>
          )}
          {flags.customDashComparisonWidgets && (
            <WhyLabsButton
              variant="filled"
              className={classes.copyButton}
              size="xs"
              leftIcon={<IconPlus color={Colors.secondaryLight1000} size={18} />}
              color="gray"
              onClick={() => createWidgetDrawerState.setter({ open: true, widgetIndex: 0 })}
            >
              Add widget
            </WhyLabsButton>
          )}
          {shouldEnableCopyButton && (
            <WhyLabsButton
              className={classes.copyButton}
              color="gray"
              leftIcon={<IconClipboardCopy color={Colors.secondaryLight1000} size={18} />}
              onClick={handleCopyURL}
              size="xs"
              variant="outline"
            >
              Copy URL
            </WhyLabsButton>
          )}
          {saveButton}
          {shouldEnableDeleteButton && (
            <WhyLabsButton
              className={classes.copyButton}
              color="gray"
              onClick={toggleDeleteDialog}
              size="xs"
              variant="outline"
            >
              Delete
            </WhyLabsButton>
          )}
        </div>
      </div>
      <WhyLabsConfirmationDialog
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        dialogTitle={`Delete ${displayName.trim()}?`}
        disabledConfirmButton={viewModel.isDeleting}
        isOpen={isDeleteDialogOpen}
        modalSize="500px"
        onClose={toggleDeleteDialog}
        onConfirm={viewModel.deleteDashboard}
      >
        <div className={classes.confirmDeletionDialogFlex}>
          <WhyLabsText>
            You will permanently delete the dashboard, and all users will lose access. This cannot be undone.
          </WhyLabsText>
          <WhyLabsText>Do you want to continue?</WhyLabsText>
        </div>
      </WhyLabsConfirmationDialog>
    </>
  );
};
