import { createStyles } from '@mantine/core';
import { WhyLabsButton, WhyLabsDrawer } from '~/components/design-system';
import { JSX, useState } from 'react';

const useStyles = createStyles(() => ({
  root: {
    background: '#fff',
    width: '100%',
    minHeight: '400px',
    padding: '15px',
  },
}));

export const DrawerPlayground = (): JSX.Element => {
  const { classes } = useStyles();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={classes.root}>
      <WhyLabsButton variant="outline" onClick={() => setIsOpen(!isOpen)}>
        Open drawer
      </WhyLabsButton>
      <WhyLabsDrawer
        uniqueId="playground-drawer"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="50%"
        withOverlay={false}
      >
        {' '}
        some content
      </WhyLabsDrawer>
    </div>
  );
};
