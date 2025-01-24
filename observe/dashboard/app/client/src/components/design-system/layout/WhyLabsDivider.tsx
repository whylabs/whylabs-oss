import { createStyles } from '@mantine/core';
import { JSX } from 'react';

const useStyles = createStyles((_, { margin }: { margin: number }) => ({
  container: {
    background: '#e2e6f1',
    height: 1,
    margin: `${margin}px 0`,
    width: '100%',
  },
}));

type WhyLabsDividerProps = {
  className?: string;
  size?: 'small' | 'medium' | 'large' | number;
};

export const WhyLabsDivider = ({ className, size = 'medium' }: WhyLabsDividerProps): JSX.Element => {
  const { classes, cx } = useStyles({ margin: getMargin() });
  return <div className={cx(classes.container, className)} data-testid="WhyLabs" />;

  function getMargin(): number {
    if (typeof size === 'number') return size;

    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 30;
      case 'medium':
      default:
        return 24;
    }
  }
};
