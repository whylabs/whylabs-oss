import { createStyles, getStylesRef } from '@mantine/core';
import CloseIcon from '@material-ui/icons/Close';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import externalLinks from 'constants/externalLinks';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useUserContext } from 'hooks/useUserContext';
import { useContext, useMemo, useState, createContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Sidebar, { SidebarStyles } from 'react-sidebar';
import { canAccessInternalAdmin, canManageSettings } from 'utils/permissionUtils';
import { PageBases } from 'pages/page-types/pageType';
import { useKeyboardEventListener } from 'hooks/useKeyboardEventListener';
import { useIsDemoOrg } from 'hooks/useIsDemoOrg';
import { WhyLabsText } from 'components/design-system';
import { SpanButton } from '../SpanButton';
import { WhyLabsLogo } from '../WhyLabsLogo';
import { MarketplaceNotice } from '../../../marketplace/marketplace-expiration-notice';

const hoverBackground = 'rgba(49, 59, 61, 0.5)';

const useStyles = createStyles({
  contentRoot: {
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
    backgroundColor: Colors.night1,
    minWidth: 300,
    minHeight: '100%',
  },
  logoRow: {
    display: 'flex',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  xIcon: {
    color: Colors.white,
    cursor: 'pointer',
    position: 'relative',
    top: -3,
    '&:hover': {
      backgroundColor: Colors.secondaryLight1000,
    },
  },
  contentSection: {
    ref: getStylesRef('contentSection'),
    cursor: 'pointer',
    color: Colors.brandSecondary400,
    margin: 0,
    padding: '10px',
    fontSize: 14,
    justifyContent: 'flex-start',
    fontFamily: 'Asap, sans-serif',
  },
  undecoratedA: {
    textDecoration: 'none',
    marginBottom: '2px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modal: {
    width: 510,
  },
  contentSectionBottom: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    color: Colors.white,
    paddingLeft: 10,
  },

  hoverState: {
    '&:hover': {
      backgroundColor: hoverBackground,
      borderRadius: '4px',
      [`& .${getStylesRef('contentSection')}`]: {
        color: Colors.white,
      },
    },
    [`&:active .${getStylesRef('contentSection')}`]: {
      color: `${Colors.brandPrimary200} !important`,
    },
    '&:active': {
      backgroundColor: Colors.secondaryLight1000,
    },
  },

  activeNavLink: {
    backgroundColor: Colors.secondaryLight1000,
    borderRadius: '4px',
    [`& .${getStylesRef('contentSection')}`]: {
      color: Colors.brandPrimary200,
    },
    '&:hover': {
      backgroundColor: Colors.secondaryLight1000,
      [`& .${getStylesRef('contentSection')}`]: {
        color: Colors.brandPrimary100,
      },
    },
  },
});

interface WhySidebarContextProps {
  readonly sidebarOpen: boolean;
  readonly setSidebarOpen: (open: boolean) => void;
}

export const WhySidebarContext = createContext<WhySidebarContextProps>({
  sidebarOpen: false,
  setSidebarOpen: () => {
    /**/
  },
});

interface WhySidebarProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Utility wrapper around the provider to encapsulate the state management logic too. Without this,
 * you would need to put the state somewhere else in our top level App.ts and it ends up causing
 * rerenders on a lot of things that don't expect to be rerendered often.
 * @param param0
 */
export function WhySidebarProvider({ children }: WhySidebarProviderProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <WhySidebarContext.Provider value={{ sidebarOpen: open, setSidebarOpen: setOpen }}>
      {children}
    </WhySidebarContext.Provider>
  );
}

function SidebarContent(): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { setSidebarOpen } = useContext(WhySidebarContext);
  const { getNavUrl, getNavUrlWithoutOrg } = useNavLinkHandler();
  const { getCurrentUser, isWhyLabsUser } = useUserContext();
  const isDemoOrg = useIsDemoOrg();

  const user = getCurrentUser();
  const userCanManageSettings = canManageSettings(user);
  const showInternalAdminTab = canAccessInternalAdmin(user);
  const onItemClick = useMemo(() => () => setSidebarOpen(false), [setSidebarOpen]);

  useKeyboardEventListener({
    keydown: {
      Escape: () => {
        setSidebarOpen(false);
      },
    },
  });

  const NavLinkStyled = ({
    displayBetaTag,
    isNewStackLink,
    linkText,
    to,
  }: {
    displayBetaTag?: boolean;
    isNewStackLink?: boolean;
    linkText: string;
    to: string;
  }) => {
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

    const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      if (isNewStackLink) {
        event.stopPropagation();
        event.preventDefault();

        // force redirect to the new stack
        window.location.href = to;
        return;
      }

      onItemClick();
    };

    return (
      <NavLink
        end
        className={({ isActive }) =>
          cx(styles.undecoratedA, styles.hoverState, {
            [styles.activeNavLink]: isActive,
          })
        }
        to={to}
        onClick={handleLinkClick}
      >
        <WhyLabsText inherit className={cx(styles.contentSection)}>
          {linkText}
        </WhyLabsText>
        {renderBetaTag()}
      </NavLink>
    );
  };

  const SafeLinkStyled = ({ to, linkText }: { to: string; linkText: string }) => (
    <SafeLink className={cx(styles.undecoratedA, styles.hoverState)} href={to}>
      <WhyLabsText inherit className={cx(styles.contentSection)}>
        {linkText}
      </WhyLabsText>
    </SafeLink>
  );

  const getNavUrlFn = isDemoOrg ? getNavUrlWithoutOrg : getNavUrl;

  const integrationsLink = getNavUrlFn({ page: 'settings', settings: { path: 'integrations' } });

  return (
    <div className={styles.contentRoot}>
      <div className={styles.logoRow}>
        <WhyLabsLogo onClick={onItemClick} />
        <SpanButton id="close-hamburger-menu" aria-label="Close sidebar menu" onClick={onItemClick}>
          <CloseIcon className={styles.xIcon} />
        </SpanButton>
      </div>

      <NavLinkStyled to={getNavUrl({ page: 'home' })} linkText="Project dashboard" />
      <NavLinkStyled to={getNavUrl({ page: 'customDashboards' })} linkText="My Dashboards" />
      {userCanManageSettings && <NavLinkStyled to={getNavUrl({ page: 'settings' })} linkText="Settings" />}
      {isWhyLabsUser() && <NavLinkStyled to={PageBases.chartPlayground} linkText="Chart Playground" />}
      {isWhyLabsUser() && <NavLinkStyled to={PageBases.designPlayground} linkText="Design Playground" />}

      <NavLinkStyled to={integrationsLink} linkText="Integration setup and examples" />
      <NavLinkStyled to={getNavUrl({ page: 'getStarted' })} linkText="Getting started guide" />

      <SafeLinkStyled to={externalLinks.support} linkText="Support center" />

      <SafeLinkStyled to={externalLinks.privacyPolicy} linkText="Privacy policy" />

      <SafeLinkStyled to={externalLinks.documentation} linkText="Documentation" />

      {showInternalAdminTab && (
        <>
          <br />
          <Link to="/admin" className={cx(styles.undecoratedA, styles.hoverState)} onClick={onItemClick}>
            <WhyLabsText inherit className={cx(styles.contentSection)}>
              Admin control panel
            </WhyLabsText>
          </Link>
          <Link to="/flags" className={cx(styles.undecoratedA, styles.hoverState)} onClick={onItemClick}>
            <WhyLabsText inherit className={cx(styles.contentSection)}>
              Feature flag investigator
            </WhyLabsText>
          </Link>
        </>
      )}

      <div className={styles.contentSectionBottom}>
        <MarketplaceNotice />
      </div>
    </div>
  );
}

// Explicit zIndex to compensate for some zIndex things we've done around the app.
const zIndex = 1000;

const sidebarStyleOverrides: SidebarStyles = {
  root: { position: undefined, zIndex: `${zIndex + 1}` },
  content: { position: undefined, zIndex: `${zIndex + 1}` },
  sidebar: { background: Colors.night1, zIndex: `${zIndex + 1}` },
  overlay: { zIndex: `${zIndex}` },
};

export function WhySidebar(): JSX.Element {
  return (
    <WhySidebarContext.Consumer>
      {({ sidebarOpen: open, setSidebarOpen: setOpen }) => (
        <Sidebar sidebar={<SidebarContent />} open={open} onSetOpen={setOpen} styles={sidebarStyleOverrides}>
          {/* The purpose of this div is to avert the "error: children is a required element, but given as undefined" message */}
          <div />
        </Sidebar>
      )}
    </WhySidebarContext.Consumer>
  );
}
