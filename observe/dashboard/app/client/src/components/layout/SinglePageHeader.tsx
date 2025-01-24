import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';
import { useFlags } from '~/hooks/useFlags';
import { JSX, ReactNode } from 'react';

import SidebarMenuButton from '../sidebar/SidebarMenuButton';
import { WhyLabsLogo } from '../WhyLabsLogo/WhyLabsLogo';

const useStyles = createStyles(() => ({
  header: {
    background: Colors.darkHeader,
  },
  primaryHeader: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 14,
    padding: '4px 0',
    paddingLeft: 10,
    paddingRight: 8,
    height: SINGLE_HEADER_TOP_CONTAINER_HEIGHT,
  },
  flexContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: 18,
  },
  headerTopContainer: {
    color: Colors.white,
    paddingTop: 2,
  },
  logoContainer: {
    display: 'flex',
    gap: 11,
    marginTop: -3,
  },
}));

type SinglePageHeaderProps = {
  children: ReactNode;
  secondaryHeader?: ReactNode;
};

export const SinglePageHeader = ({ children, secondaryHeader }: SinglePageHeaderProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const flags = useFlags();

  return (
    <header className={classes.header} data-testid="SinglePageHeader">
      <div className={classes.primaryHeader}>
        <div className={cx(classes.flexContainer, classes.headerTopContainer)}>
          <div className={classes.logoContainer}>
            {flags.settingsPage && <SidebarMenuButton />}
            <WhyLabsLogo />
          </div>
          {children}
        </div>
      </div>
      {secondaryHeader}
    </header>
  );
};
