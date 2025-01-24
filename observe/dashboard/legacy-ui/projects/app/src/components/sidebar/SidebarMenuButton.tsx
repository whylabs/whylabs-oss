import { SpanButton } from 'components/controls/widgets/SpanButton';
import { IconMenu2 } from '@tabler/icons';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhySidebarContext } from 'components/controls/widgets/sidebar/WhySidebar';
import { useContext } from 'react';

export const useStyles = createStyles((_, isDark: boolean) => ({
  logoSpan: {
    padding: 5,
    paddingLeft: 0,
  },
  menuIcon: {
    color: isDark ? Colors.night1 : Colors.white,
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
