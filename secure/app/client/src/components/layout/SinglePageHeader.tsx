import { createStyles } from '@mantine/core';
import { JSX, ReactNode } from 'react';
import { Colors } from '~/assets/Colors';
import { SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';

import { HomeButton } from '../HomeButton/HomeButton';

const useStyles = createStyles(() => ({
  header: {
    background: Colors.darkHeader,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 14,
    padding: '4px 15px',
    height: SINGLE_HEADER_TOP_CONTAINER_HEIGHT,
  },
  flexContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: 18,
  },
  headerTopContainer: {
    color: Colors.white,
  },
  sidebarMenuAndLogoContainer: {
    display: 'flex',
    gap: 8,
  },
}));

type SinglePageHeaderProps = {
  children: ReactNode;
};

export const SinglePageHeader = ({ children }: SinglePageHeaderProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const isDark = false;

  return (
    <header className={classes.header} data-testid="SinglePageHeader">
      <div className={cx(classes.flexContainer, classes.headerTopContainer)}>
        <div className={classes.sidebarMenuAndLogoContainer}>
          <HomeButton isDark={isDark} />
        </div>
        {children}
      </div>
    </header>
  );
};
