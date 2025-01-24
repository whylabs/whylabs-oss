import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { JSX, ReactNode } from 'react';

const useStyles = createStyles(() => ({
  root: {
    overflow: 'auto',
    width: '100%',
  },
  container: {
    background: Colors.white,
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
    minWidth: '100%',
    padding: 15,
    width: 'fit-content',

    '& > *': {
      width: 'max-content',
    },
  },
}));

type ControlsSectionProps = {
  children: ReactNode;
};

export const ControlsSection = ({ children }: ControlsSectionProps): JSX.Element => {
  const { classes } = useStyles();

  return (
    <section className={classes.root}>
      <div className={classes.container}>{children}</div>
    </section>
  );
};
