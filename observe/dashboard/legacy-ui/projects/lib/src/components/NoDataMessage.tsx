import createStyles from '@material-ui/core/styles/createStyles';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);

export interface NoDataMessageProps {
  readonly children: React.ReactNode;
}

export function NoDataMessage({ children }: NoDataMessageProps): JSX.Element {
  const styles = useStyles();

  return <div className={styles.root}>{children}</div>;
}
