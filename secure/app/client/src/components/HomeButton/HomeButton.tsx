import { createStyles } from '@mantine/core';
import { IconHomeFilled } from '@tabler/icons-react';
import { JSX } from 'react';
import { Colors } from '~/assets/Colors';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';

const useStyles = createStyles({
  invisibleButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
});

export interface HomeButtonProps {
  readonly className?: string;
  isDark?: boolean;
  onClick?: () => void;
}

export const HomeButton = ({ className, isDark, onClick }: HomeButtonProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { handleNavigation } = useNavLinkHandler();

  const color = isDark ? 'white' : Colors.brandSecondary100;

  return (
    <button className={cx(classes.invisibleButton, className)} id="home-button" onClick={handleOnClick} type="button">
      <IconHomeFilled size={24} color={color} />
    </button>
  );

  function handleOnClick() {
    if (onClick) {
      onClick();
      return;
    }
    handleNavigation({ page: 'resources' });
  }
};
