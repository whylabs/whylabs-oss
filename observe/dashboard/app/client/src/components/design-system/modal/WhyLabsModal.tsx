import { Modal, ModalProps } from '@mantine/core';
import { FC } from 'react';

export type WhyLabsModalProps = Omit<
  ModalProps,
  'transition' | 'transitionDuration' | 'transitionTimingFunction' | 'exitTransitionDuration' | 'closeButtonProps'
>;

// Defining a common transition to modals
const WhyLabsModal: FC<WhyLabsModalProps> = (props) => {
  const { children } = props;
  return (
    <Modal
      {...props}
      data-testid="WhyLabsModal"
      transitionProps={{ transition: 'fade', duration: 300, exitDuration: 300, timingFunction: 'ease' }}
      styles={{
        title: {
          fontWeight: 600,
          fontFamily: 'Asap',
          fontSize: '16px',
          lineHeight: 1.5,
        },
      }}
      closeButtonProps={{ size: 'md', color: 'dark' }}
    >
      {children}
    </Modal>
  );
};

export default WhyLabsModal;
