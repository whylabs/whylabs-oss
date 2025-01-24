import { createStyles } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { useContext } from 'react';

import { SpanButton } from './SpanButton';
import { WhySidebarContext } from './WhyLabsSidebar';

export const useStyles = createStyles((_, isDark: boolean) => ({
  logoSpan: {
    padding: 5,
    paddingLeft: 0,
  },
  menuIcon: {
    color: isDark ? Colors.darkHeader : Colors.white,
  },
}));

type SidebarMenuButtonProps = {
  isDark?: boolean;
};

const SidebarMenuButton = ({ isDark }: SidebarMenuButtonProps): JSX.Element => {
  const { classes } = useStyles(!!isDark);
  const { setSidebarOpen } = useContext(WhySidebarContext);

  return (
    <SpanButton
      id="open-hamburger-menu"
      aria-label="Open sidebar menu"
      className={classes.logoSpan}
      onClick={openSidebar}
    >
      <IconMenu2 className={classes.menuIcon} />
    </SpanButton>
  );

  function openSidebar() {
    setSidebarOpen(true);
  }
};

export default SidebarMenuButton;
