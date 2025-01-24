import { WhyLabsButton, WhyLabsTypography } from 'components/design-system';
import { IconArrowLeft } from '@tabler/icons';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ActionOption } from 'pages/settings-pages/notifications/globalActionUtils';
import { useNewNotificationPageStyles } from '../../NewNotificationsPageContentAreaStyles';
import { useNotificationActionRequestHandler } from '../useNotificationActionRequestHandler';

interface ActionHeaderControlsProps {
  editMode?: boolean;
  handleDelete: (confirmed: boolean) => void;
  handleEditState: (edit: boolean) => void;
  actionOption?: ActionOption;
  loading?: boolean;
  isEnabled: boolean;
}
export const ActionHeaderControls: React.FC<ActionHeaderControlsProps> = ({
  editMode,
  handleEditState,
  handleDelete,
  actionOption,
  loading = false,
  isEnabled,
}) => {
  const { classes, cx } = useNewNotificationPageStyles();
  const { passedId } = usePageTypeWithParams();
  const { handleNavigation } = useNavLinkHandler();
  const { testAction, loadBlocker } = useNotificationActionRequestHandler({});
  const navigateBack = () => {
    handleNavigation({ page: 'settings', settings: { path: 'notifications' } });
  };
  const handleTestMessage = () => {
    if (!passedId || !actionOption) return;
    testAction(passedId, actionOption.type);
  };
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
      <WhyLabsTypography order={4} className={classes.bold}>
        {passedId}
      </WhyLabsTypography>
      <div className={cx(classes.flexRow, classes.buttonsContainer)}>
        <WhyLabsButton
          variant="outline"
          color="gray"
          onClick={handleTestMessage}
          disabled={loadBlocker || !isEnabled}
          disabledTooltip={!isEnabled ? 'Disabled action' : 'Sending message...'}
        >
          Send test message
        </WhyLabsButton>
        {/*  TODO: This button is v.next */}
        {/* <WhyLabsButton variant="outline" color="gray"> */}
        {/*  Relate monitors */}
        {/* </WhyLabsButton> */}
        <WhyLabsButton
          variant="outline"
          color="gray"
          disabled={editMode || loading}
          disabledTooltip="No changes to save"
          className={cx({
            [classes.buttonOrangeGradient]: editMode,
          })}
          onClick={() => {
            if (editMode) return;
            handleEditState(true);
          }}
        >
          Edit
        </WhyLabsButton>
        <WhyLabsButton
          variant="outline"
          color="danger"
          onClick={() => handleDelete(false)}
          disabled={loading}
          disabledTooltip="Loading..."
        >
          Delete
        </WhyLabsButton>
      </div>
    </div>
  );
};
