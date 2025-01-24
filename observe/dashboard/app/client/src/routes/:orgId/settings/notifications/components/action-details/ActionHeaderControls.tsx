import { IconArrowLeft } from '@tabler/icons-react';
import { WhyLabsButton, WhyLabsTypography } from '~/components/design-system';

import { useNewNotificationPageStyles } from '../../notificationStyles';
import { useNotificationsViewModel } from '../../useNotificationsViewModel';

type ActionHeaderControlsProps = {
  viewModel: ReturnType<typeof useNotificationsViewModel>;
};
export const ActionHeaderControls = ({ viewModel }: ActionHeaderControlsProps) => {
  const { classes, cx } = useNewNotificationPageStyles();

  const { handleTestMessage, navigateBack, handleEdit, isLoading, handleDelete, editingActionId, actionDetails } =
    viewModel;

  return (
    <div className={classes.flexRow}>
      <WhyLabsButton
        variant="outline"
        color="gray"
        onClick={navigateBack}
        leftIcon={<IconArrowLeft stroke={1} size={18} />}
      >
        Back
      </WhyLabsButton>
      <WhyLabsTypography className={classes.bold} element="h4">
        {actionDetails?.id}
      </WhyLabsTypography>
      <div className={cx(classes.flexRow, classes.buttonsContainer)}>
        <WhyLabsButton
          variant="outline"
          color="gray"
          onClick={handleTestMessage}
          disabled={isLoading || !actionDetails?.enabled}
          disabledTooltip={!actionDetails?.enabled ? 'Disabled action' : 'Sending message...'}
        >
          Send test message
        </WhyLabsButton>
        <WhyLabsButton
          variant="outline"
          color="gray"
          disabled={!!editingActionId || isLoading}
          disabledTooltip="No changes to save"
          className={cx({
            [classes.buttonOrangeGradient]: !!editingActionId,
          })}
          onClick={() => {
            if (!actionDetails?.id) return;
            handleEdit(actionDetails?.id);
          }}
        >
          Edit
        </WhyLabsButton>
        <WhyLabsButton
          variant="outline"
          color="danger"
          onClick={() => handleDelete(false)}
          disabled={isLoading}
          disabledTooltip="Loading..."
        >
          Delete
        </WhyLabsButton>
      </div>
    </div>
  );
};
