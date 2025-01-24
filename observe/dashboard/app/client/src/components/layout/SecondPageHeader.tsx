import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { useRouteTitle } from '~/hooks/useRouteTitle';
import useTypographyStyles from '~/styles/Typography';
import { ReactNode } from 'react';

import { WhyLabsText } from '../design-system';

const useStyles = createStyles({
  root: {
    alignItems: 'flex-end',
    backgroundColor: Colors.darkHeader,
    display: 'flex',
    height: 66,
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingLeft: 50,
    paddingRight: 10,
  },
  rootWithPreTitle: {
    paddingLeft: 10,
  },
  titleContainer: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  title: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 300,
    width: 'max-content',
  },
});

type SecondPageHeaderProps = {
  children?: ReactNode;
  preTitleChildren?: ReactNode;
};

export const SecondPageHeader = ({ children, preTitleChildren }: SecondPageHeaderProps) => {
  const { classes, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  const titleFn = useRouteTitle();
  const title = titleFn?.() || '';

  return (
    <div
      className={cx(classes.root, {
        [classes.rootWithPreTitle]: !!preTitleChildren,
      })}
    >
      <div className={classes.titleContainer}>
        {preTitleChildren}
        <WhyLabsText inherit className={cx(typography.headerLight, classes.title)}>
          {title}
        </WhyLabsText>
      </div>
      {children}
    </div>
  );
};
