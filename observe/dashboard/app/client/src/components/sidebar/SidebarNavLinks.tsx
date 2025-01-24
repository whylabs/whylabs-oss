import { cx } from '@emotion/css';
import { Colors } from '~/assets/Colors';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { MouseEvent } from 'react';
import { NavLink } from 'react-router-dom';

import { WhyLabsText } from '../design-system';
import { SafeLink } from '../link/SafeLink';
import { useSidebarStyles } from './useSidebarStyles';

type NavLinkStyledProps = {
  displayBetaTag?: boolean;
  isOldStackLink?: boolean;
  linkText: string;
  onClick: () => void;
  to: string;
};

export const NavLinkStyled = ({
  displayBetaTag,
  isOldStackLink,
  linkText,
  onClick,
  to: linkTo,
}: NavLinkStyledProps) => {
  const { classes } = useSidebarStyles();
  const { getOldStackUrl, replaceBrowserLocation } = useNavLinkHandler();

  const renderBetaTag = () => {
    if (!displayBetaTag) return null;
    return (
      <div
        style={{
          fontSize: '13px',
          backgroundColor: Colors.orange,
          color: 'white',
          padding: 2,
          borderRadius: 2,
          height: 18,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Beta
      </div>
    );
  };

  const to = isOldStackLink ? getOldStackUrl(linkTo) : linkTo;

  const handleOldStackLinkClick = (event: MouseEvent) => {
    if (isOldStackLink) {
      event.stopPropagation();
      event.preventDefault();

      // navigate to old stack
      replaceBrowserLocation(to);
      return;
    }

    onClick();
  };

  return (
    <NavLink
      end
      className={({ isActive }) =>
        cx(classes.undecoratedA, classes.hoverState, {
          [classes.activeNavLink]: isActive,
        })
      }
      to={to}
      onClick={handleOldStackLinkClick}
    >
      <WhyLabsText inherit className={cx(classes.contentSection)}>
        {linkText}
      </WhyLabsText>
      {renderBetaTag()}
    </NavLink>
  );
};

export const SafeLinkStyled = ({ to, linkText }: { to: string; linkText: string }) => {
  const { classes } = useSidebarStyles();
  return (
    <SafeLink className={cx(classes.undecoratedA, classes.hoverState)} href={to}>
      <WhyLabsText inherit className={cx(classes.contentSection)}>
        {linkText}
      </WhyLabsText>
    </SafeLink>
  );
};
