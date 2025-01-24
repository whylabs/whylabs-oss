import { Divider, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { CSSProperties, JSX } from 'react';

type StyleProps = {
  height: CSSProperties['height'];
};

const useStyles = createStyles((_, { height }: StyleProps) => ({
  container: {
    borderLeftColor: Colors.brandSecondary200,
    margin: 'auto 0',
    height,
  },
}));

type WhyLabsVerticalDividerProps = Partial<StyleProps> & {
  className?: string;
};

export const WhyLabsVerticalDivider = ({ className, height = '100%' }: WhyLabsVerticalDividerProps): JSX.Element => {
  const { classes, cx } = useStyles({ height });
  return (
    <Divider className={cx(classes.container, className)} data-testid="WhyLabsVerticalDivider" orientation="vertical" />
  );
};
