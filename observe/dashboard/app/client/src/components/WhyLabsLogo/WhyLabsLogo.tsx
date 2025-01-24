import { createStyles } from '@mantine/core';
import darkLogo from '~/assets/whylabs-logo-dark.svg';
import logo from '~/assets/whylabs-logo-white.svg';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { IS_DEV_ENV } from '~/utils/constants';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { JSX } from 'react';

const useStyles = createStyles({
  image: {
    height: '18px',
  },
  geImage: {
    height: '27px',
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
  invisibleButton: {
    background: 'transparent',
    border: 'none',
    padding: 0,
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

export const WhyLabsLogo = ({ className, isDark, onClick }: WhyLabsLogoProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { handleNavigation } = useNavLinkHandler();
  const whyLogoSrc = isDark ? darkLogo : logo;
  const logoSrc = whyLogoSrc;

  const altText = 'WhyLabs logo';

  return (
    <button
      className={cx(classes.invisibleButton, classes.clickable, className)}
      id="whylabs-logo"
      onClick={handleOnClick}
      type="button"
    >
      <img className={classes.image} src={logoSrc} alt={altText} />
    </button>
  );

  function handleOnClick() {
    if (onClick) {
      onClick();

      // Prevent the default navigation if the onClick handler is provided
      return;
    }

    if (IS_DEV_ENV) {
      handleNavigation({ page: 'resources' });
    } else {
      forceRedirectToOrigin();
    }
  }
};
