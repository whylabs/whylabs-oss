import { createStyles } from '@mantine/core';

import { WhyLabsModal } from '../design-system';
import { FeedbackForm } from './FeedbackForm';
import { useFeedbackForm } from './useFeedbackForm';

const useStyles = createStyles({
  root: {
    width: 510,
  },
});

export const FeedbackFormModal = () => {
  const { classes } = useStyles();
  const { feedbackInfo, isOpen, onClose } = useFeedbackForm();

  return (
    <WhyLabsModal
      classNames={{ content: classes.root }}
      opened={isOpen}
      onClose={onClose}
      size={480}
      withCloseButton={false}
    >
      <FeedbackForm onClose={onClose} feedbackInfo={feedbackInfo} />
    </WhyLabsModal>
  );
};
