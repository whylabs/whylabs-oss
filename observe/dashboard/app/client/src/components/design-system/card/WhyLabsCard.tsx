import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactNode } from 'react';

type StylesProps = {
  hasBorder?: boolean;
};

const useStyles = createStyles((_, { hasBorder }: StylesProps) => ({
  root: {
    alignContent: 'stretch',
    backgroundColor: Colors.whiteBackground,
    boxSizing: 'border-box',
    border: `2px solid ${hasBorder ? Colors.brandSecondary900 : Colors.transparent}`,
    borderRadius: 4,
    color: Colors.brandSecondary900,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 12,
    width: '100%',
  },
}));

type WhyLabsCardProps = {
  children: ReactNode;
  className?: string;
  hasBorder?: boolean;
};

export const WhyLabsCard = ({ children, className, hasBorder }: WhyLabsCardProps): JSX.Element => {
  const { classes, cx } = useStyles({ hasBorder });

  return (
    <div className={cx(classes.root, className)} data-testid="WhyLabsCard">
      {children}
    </div>
  );
};
