import { createStyles } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import darkLogo from 'ui/whylabs-logo-dark.svg';
import logo from 'ui/whylabs-logo-white.svg';
import { useMediaQuery } from '@mantine/hooks';

const useStyles = createStyles({
  image: {
    height: '18px',
    width: '142px',
  },
  geImage: {
    height: '27px',
    width: '142px',
  },
  itemRow: {
    height: '40px',
    minHeight: '40px',
    paddingLeft: '18px',
    flexGrow: 1,
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  clickable: {
    cursor: 'pointer',
  },
});

export interface WhyLabsLogoProps {
  readonly className?: string;
  isDark?: boolean;
  onClick?: () => void;
}

export function WhyLabsLogo({ className, isDark, onClick }: WhyLabsLogoProps): JSX.Element {
  const { classes, cx } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const isMobileUser = useMediaQuery('(max-width:1000px)');

  return (
    <NavLink
      className={cx(className, classes.clickable)}
      to={isMobileUser ? getNavUrl({ page: 'getStarted' }) : getNavUrl({ page: 'home' })}
      onClick={onClick}
      id="whylabs-logo"
    >
      <img className={classes.image} src={isDark ? darkLogo : logo} alt="WhyLabs logo" />
    </NavLink>
  );
}
