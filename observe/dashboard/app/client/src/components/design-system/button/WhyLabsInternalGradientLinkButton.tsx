import { createStyles } from '@mantine/core';
import { Link, LinkProps } from 'react-router-dom';

import { useCommonButtonStyles } from './buttonStyleUtils';

const useStyles = createStyles(() => ({
  root: {
    alignItems: 'center',
    borderRadius: 4,
    display: 'flex',
    fontSize: 14,
    fontWeight: 600,
    height: 36,
    padding: '8px 17px',
    textDecoration: 'none',
    flexShrink: 0,
  },
}));

export const WhyLabsInternalGradientLinkButton = ({ children, className, to, ...rest }: LinkProps): JSX.Element => {
  const { classes: commonClasses } = useCommonButtonStyles();
  const { classes, cx } = useStyles();

  return (
    <Link
      className={cx(commonClasses.gradient, classes.root, className)}
      data-testid="WhyLabsInternalGradientLinkButton"
      to={to}
      {...rest}
    >
      {children}
    </Link>
  );
};
