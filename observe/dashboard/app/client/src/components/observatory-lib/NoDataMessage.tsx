import { createStyles } from '@mantine/core';
import React from 'react';

const useStyles = createStyles(() => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

export interface NoDataMessageProps {
  readonly children: React.ReactNode;
}

export const NoDataMessage = ({ children }: NoDataMessageProps): JSX.Element => {
  const { classes } = useStyles();

  return <div className={classes.root}>{children}</div>;
};
