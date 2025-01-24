import { createStyles } from '@mantine/core';

import { SkeletonGroup } from '../design-system';
import { ObservationNode, ObservationNodeProps } from './ObservationNode';

const useStyles = createStyles(() => ({
  root: {
    overflow: 'auto',
    height: '100%',
    padding: 10,
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
}));

type ObservationTreeProps = Pick<ObservationNodeProps, 'observations' | 'onChange' | 'selectedId'> & {
  isLoading?: boolean;
};

export const ObservationTree = ({ isLoading, ...rest }: ObservationTreeProps): JSX.Element => {
  const { classes } = useStyles();

  if (isLoading) {
    return (
      <div className={classes.skeletonContainer}>
        <SkeletonGroup count={8} height={60} />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <ObservationNode {...rest} indentationLevel={0} />
    </div>
  );
};
