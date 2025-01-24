import { MantineNumberSize, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactNode } from 'react';

import WhyLabsButton from '../button/WhyLabsButton';
import WhyLabsModal from './WhyLabsModal';

const useStyles = createStyles({
  root: {
    padding: '20px 15px',
  },
  title: {
    fontSize: 16,
    lineHeight: 1.12,
    color: 'black',
    fontWeight: 'normal',
    fontFamily: 'Asap',
  },
  noPadding: {
    padding: 0,
  },
  content: {
    fontSize: 14,
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
    justifyContent: 'end',
    paddingTop: 15,
  },
  dialogConfirmButton: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.42,
    letterSpacing: '-0.14px',
    padding: '8px 17px',
  },
  dialogButtonCancel: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.53,
    letterSpacing: '-0.13px',
    padding: '8px 17px',
  },
});

interface ConfirmationDialogProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dialogTitle?: ReactNode;
  confirmButtonText: string;
  confirmVariant?: 'danger' | 'primary';
  confirmButtonClass?: string;
  disabledConfirmButton?: boolean;
  closeButtonText: string;
  modalSize?: MantineNumberSize;
  avoidDismiss?: boolean;
  isLoading?: boolean;
}

const WhyLabsConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  dialogTitle,
  confirmButtonText,
  closeButtonText,
  children,
  modalSize = 'max-content',
  confirmVariant = 'danger',
  confirmButtonClass,
  disabledConfirmButton,
  avoidDismiss,
  isLoading,
}: ConfirmationDialogProps) => {
  const { classes: styles, cx } = useStyles();

  return (
    <WhyLabsModal
      opened={isOpen}
      onClose={onClose}
      title={dialogTitle}
      centered
      classNames={{ content: styles.root, title: styles.title, header: styles.noPadding, body: styles.noPadding }}
      size={modalSize}
      closeOnClickOutside={!avoidDismiss}
      withCloseButton={!avoidDismiss}
      zIndex={999}
    >
      <div className={styles.content}>
        {children}
        <div className={styles.buttonGroup}>
          <WhyLabsButton variant="outline" color="gray" onClick={onClose} className={styles.dialogButtonCancel}>
            {closeButtonText}
          </WhyLabsButton>
          <WhyLabsButton
            variant="filled"
            color={confirmVariant}
            disabled={disabledConfirmButton}
            onClick={onConfirm}
            className={cx(styles.dialogConfirmButton, confirmButtonClass)}
            loading={isLoading}
          >
            {confirmButtonText}
          </WhyLabsButton>
        </div>
      </div>
    </WhyLabsModal>
  );
};

export default WhyLabsConfirmationDialog;
