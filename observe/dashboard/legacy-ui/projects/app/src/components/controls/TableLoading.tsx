import { Skeleton } from '@material-ui/lab';
import { Spacings } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
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
});

/**
 * @deprecated use the one from lib instead.
 */
export function TableLoading(): JSX.Element {
  const { classes: styles } = useStyles();
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
