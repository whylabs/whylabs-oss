import { useEffect, useState, KeyboardEvent } from 'react';
import {
  useClearMaintenanceBarMutation,
  useGetMaintenanceBannerForAdminQuery,
  useUpdateMaintenanceBarMutation,
} from 'generated/graphql';
import { WhyLabsButton, WhyLabsConfirmationDialog, WhyLabsText } from 'components/design-system';
import { format } from 'date-fns-tz';
import { Colors } from '@whylabs/observatory-lib';
import { tooltipDateFormat } from 'utils/dateUtils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

type StatusUpdateIntent = 'update' | 'clear';

export const MaintenanceBarControl: React.FC = () => {
  const [barMsg, setBarMsg] = useState('');
  const [statusUpdateIntent, setStatusUpdateIntent] = useState<StatusUpdateIntent>('update');
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [shouldRefreshPage, setShouldRefreshPage] = useState(false);

  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [updateMaintenanceBar] = useUpdateMaintenanceBarMutation();
  const [clearMaintenanceBar] = useClearMaintenanceBarMutation();

  const {
    data: maintenanceMsgData,
    loading: maintenanceMsgLoading,
    error: maintenanceMsgErr,
  } = useGetMaintenanceBannerForAdminQuery();

  const { message: existingMessage, updatedAt, updatedBy } = maintenanceMsgData?.maintenanceBanner ?? {};

  useEffect(() => {
    if (existingMessage) {
      setBarMsg(existingMessage);
    }
  }, [existingMessage]);

  useEffect(() => setStatusUpdateIntent(barMsg.length > 0 ? 'update' : 'clear'), [barMsg]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (shouldRefreshPage) {
        window.location.reload();
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [shouldRefreshPage]);

  if (maintenanceMsgLoading) {
    return null;
  }

  if (maintenanceMsgErr) {
    enqueueErrorSnackbar({ explanation: 'Failed to fetch banner state', err: maintenanceMsgErr });
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => setIsConfirmationDialogOpen(true);

  const handleConfirmUpdate = (msg: string, intent: StatusUpdateIntent): void => {
    const task = intent === 'update' ? updateMaintenanceBar({ variables: { message: msg } }) : clearMaintenanceBar();

    task
      .then(() => {
        enqueueSnackbar({
          title: `Successfully ${
            intent === 'update' ? 'updated' : 'cleared'
          } maintenance message. Refreshing the page.`,
        });
        // refresh the page to update status bar
        setShouldRefreshPage(true);
      })
      .catch((err) => {
        const explanation = `Failed to ${intent} maintenance message`;
        console.error(`${explanation}. ${err}`);
        enqueueErrorSnackbar({ explanation, err });
      });

    setIsConfirmationDialogOpen(false);
  };

  const confirmationDescription =
    statusUpdateIntent === 'update'
      ? `This will cause the following message to be displayed for ALL logged in users: ${barMsg}`
      : `This will clear the maintenance message for ALL logged in users`;

  const isActive = !!existingMessage?.length;

  const localeUpdatedAt = updatedAt ? format(new Date(updatedAt), tooltipDateFormat) : 'unknown';

  return (
    <div
      style={{ border: isActive ? `thick solid ${Colors.warningColor}` : 'none', padding: '5px', borderRadius: '4px' }}
    >
      <WhyLabsText>Maintenance/outage message</WhyLabsText>
      <div style={{ display: 'flex' }}>
        <textarea onKeyDown={handleKeyDown} value={barMsg} onChange={(e) => setBarMsg(e.target.value)} />
        <WhyLabsButton variant="outline" color="primary" style={{ height: 50, marginLeft: 5 }} onClick={handleSubmit}>
          Submit
        </WhyLabsButton>
      </div>
      {isActive ? (
        <WhyLabsText>
          The message above is <span style={{ fontWeight: 600 }}>ACTIVE</span> - all users can see it!
          <br />
          Updated by {updatedBy} at {localeUpdatedAt}
        </WhyLabsText>
      ) : (
        <WhyLabsText>No message is displayed currently</WhyLabsText>
      )}
      <WhyLabsConfirmationDialog
        closeButtonText="Close"
        confirmButtonText="I know what I'm doing"
        dialogTitle="Are you sure?"
        isOpen={isConfirmationDialogOpen}
        onClose={() => setIsConfirmationDialogOpen(false)}
        onConfirm={() => handleConfirmUpdate(barMsg, statusUpdateIntent)}
      >
        {confirmationDescription}
      </WhyLabsConfirmationDialog>
    </div>
  );
};
