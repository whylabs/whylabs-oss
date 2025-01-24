import WhyLabsText from '../text/WhyLabsText';
import WhyLabsConfirmationDialog from './WhyLabsConfirmationDialog';

type ConfirmationDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmLosingChangesDialog = ({ isOpen, onCancel, onConfirm }: ConfirmationDialogProps) => {
  return (
    <WhyLabsConfirmationDialog
      isOpen={isOpen}
      dialogTitle="There are changes that have not been saved."
      closeButtonText="Cancel"
      confirmButtonText="Close without saving"
      onClose={onCancel}
      onConfirm={onConfirm}
      modalSize="400px"
    >
      <WhyLabsText>Do you want to continue?</WhyLabsText>
    </WhyLabsConfirmationDialog>
  );
};
