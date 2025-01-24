import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { CSSProperties } from 'react';

type StyleProps = {
  minHeight?: CSSProperties['minHeight'];
};

const useStyles = createStyles((_, { minHeight = 160 }: StyleProps) => ({
  emptyStateContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    justifyContent: 'center',
    minHeight,
    position: 'relative',
  },
  emptyStateTitle: {
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    fontSize: 18,
    fontWeight: 300,
    margin: 0,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: Colors.secondaryLight800,
    fontFamily: 'Asap',
    fontSize: 12,
    fontWeight: 400,
    margin: 0,
    textAlign: 'center',
  },
}));

type SimpleEmptyStateMessageProps = StyleProps & {
  subtitle?: string;
  title: string;
};

export const SimpleEmptyStateMessage = ({ minHeight, subtitle, title }: SimpleEmptyStateMessageProps) => {
  const { classes } = useStyles({ minHeight });

  return (
    <div className={classes.emptyStateContainer}>
      <p className={classes.emptyStateTitle}>{title}</p>
      <p className={classes.emptyStateSubtitle}>{subtitle}</p>
    </div>
  );
};
