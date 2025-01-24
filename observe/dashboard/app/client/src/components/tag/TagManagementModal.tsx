import { createStyles } from '@mantine/core';

import { WhyLabsModal } from '../design-system';
import { TagManagement, TagManagementProps } from './TagManagement';

const useStyles = createStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  content: {
    padding: 0,
  },
});

type TagManagementModalProps = TagManagementProps & {
  isOpen: boolean;
  onClose: () => void;
};

export const TagManagementModal = ({ isOpen, onClose, ...rest }: TagManagementModalProps) => {
  const { classes } = useStyles();

  return (
    <WhyLabsModal
      classNames={{ body: classes.body, content: classes.content }}
      opened={isOpen}
      onClose={onClose}
      size={330}
      withCloseButton={false}
    >
      <TagManagement {...rest} closeModal={onClose} />
    </WhyLabsModal>
  );
};
