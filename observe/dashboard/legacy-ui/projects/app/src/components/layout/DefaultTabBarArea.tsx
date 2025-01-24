import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import useTypographyStyles from 'styles/Typography';
import { ReactNode } from 'react';

const useStyles = createStyles({
  root: {
    alignItems: 'flex-end',
    backgroundColor: Colors.night1,
    display: 'flex',
    height: '100%',
    justifyContent: 'space-between',
    paddingLeft: 10,
  },
  title: {
    color: Colors.white,
    fontSize: 24,
    padding: ' 10px 10px 0px 10px',
  },
  selectDiv: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
});

type DefaultPageLayoutProps = {
  children?: ReactNode;
  preTitleChildren?: ReactNode;
  title: string;
};

export const DefaultTabBarArea = ({ children, preTitleChildren, title }: DefaultPageLayoutProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  return (
    <div className={classes.root}>
      <div className={classes.selectDiv}>
        {preTitleChildren}
        <WhyLabsText inherit className={cx(typography.headerLight, classes.title)}>
          {title}
        </WhyLabsText>
      </div>
      {children}
    </div>
  );
};
