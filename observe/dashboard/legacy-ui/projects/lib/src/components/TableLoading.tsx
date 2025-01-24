import { createStyles, makeStyles } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import React from 'react';
import { Spacings } from '../constants/spacings';

const useStyles = makeStyles(() =>
  createStyles({
    skeletonRoot: {
      display: 'flex',
      height: '100%',
    },
    skeletonLeft: {
      flexBasis: Spacings.leftColumnWidth,
      padding: 2,
      height: '100%',
    },
    skeletonRight: {
      padding: 2,
      flexGrow: 1,
      height: '100%',
    },
    skeleton: {
      height: '100%',
      transform: 'none',
    },
  }),
);

export function TableLoading(): JSX.Element {
  const styles = useStyles();
  return (
    <div className={styles.skeletonRoot}>
      <div className={styles.skeletonLeft}>
        <Skeleton className={styles.skeleton} />
      </div>
      <div className={styles.skeletonRight}>
        <Skeleton variant="text" className={styles.skeleton} />
      </div>
    </div>
  );
}
