import { IconX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import externalLinks from '~/constants/externalLinks';
import { useKeyboardEventListener } from '~/hooks/useKeyboardEventListener';
import { useUserContext } from '~/hooks/useUserContext';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { canAccessInternalAdmin, canManageSettings } from '~/utils/permissionUtils';
import { createContext, useContext, useMemo, useState } from 'react';
import Sidebar, { SidebarStyles } from 'react-sidebar';

import { WhyLabsActionIcon, WhyLabsText } from '../design-system';
import { useFeedbackForm } from '../feedback-form/useFeedbackForm';
import { InvisibleButton } from '../misc/InvisibleButton';
import { WhyLabsLogo } from '../WhyLabsLogo/WhyLabsLogo';
import { NavLinkStyled, SafeLinkStyled } from './SidebarNavLinks';
import { useSidebarStyles } from './useSidebarStyles';

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

interface WhyLabsSidebarProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Utility wrapper around the provider to encapsulate the state management logic too. Without this,
 * you would need to put the state somewhere else in our top level App.ts and it ends up causing
 * rerenders on a lot of things that don't expect to be rerendered often.
 * @param param0
 */
export const WhyLabsSidebarProvider = ({ children }: WhyLabsSidebarProviderProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);

  const value = useMemo(() => ({ sidebarOpen: open, setSidebarOpen: setOpen }), [open, setOpen]);

  return <WhySidebarContext.Provider value={value}>{children}</WhySidebarContext.Provider>;
};

const SidebarContent = (): JSX.Element => {
  const { classes } = useSidebarStyles();
  const { setSidebarOpen } = useContext(WhySidebarContext);
  const { getNavUrl } = useNavLinkHandler();
  const { currentUser: user, isWhyLabsUser } = useUserContext();
  const { openFeedbackModal } = useFeedbackForm();

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

  return (
    <div className={classes.contentRoot}>
      <div className={classes.logoRow}>
        <WhyLabsLogo onClick={onItemClick} />
        <WhyLabsActionIcon
          className={classes.closeButton}
          customColor={Colors.white}
          id="close-hamburger-menu"
          label="Close sidebar menu"
          onClick={onItemClick}
        >
          <IconX size={24} />
        </WhyLabsActionIcon>
      </div>

      <NavLinkStyled isOldStackLink to="/resources" linkText="Project dashboard" onClick={onItemClick} />
      <NavLinkStyled to={getNavUrl({ page: 'dashboards' })} linkText="My Dashboards" onClick={onItemClick} />
      {userCanManageSettings && (
        <NavLinkStyled to={getNavUrl({ page: 'settings' })} linkText="Settings" onClick={onItemClick} />
      )}

      {isWhyLabsUser && (
        <NavLinkStyled isOldStackLink to="/chart-playground" linkText="Chart Playground" onClick={onItemClick} />
      )}
      {isWhyLabsUser && (
        <NavLinkStyled isOldStackLink to="/design-playground" linkText="Design Playground" onClick={onItemClick} />
      )}

      <NavLinkStyled
        to={getNavUrl({ page: 'settings', settings: { path: 'integrations' } })}
        linkText="Integration setup and examples"
        onClick={onItemClick}
      />
      <NavLinkStyled isOldStackLink to="/get-started" linkText="Getting started guide" onClick={onItemClick} />

      <InvisibleButton
        className={classes.hoverState}
        onClick={() => {
          onItemClick();

          openFeedbackModal({
            cardType: 'Side menu',
            componentName: 'Side menu',
          });
        }}
      >
        <WhyLabsText inherit className={classes.contentSection}>
          Send feedback
        </WhyLabsText>
      </InvisibleButton>

      <SafeLinkStyled to={externalLinks.support} linkText="Support center" />

      <SafeLinkStyled to={externalLinks.privacyPolicy} linkText="Privacy policy" />

      <SafeLinkStyled to={externalLinks.documentation} linkText="Documentation" />

      {showInternalAdminTab && (
        <>
          <br />
          <NavLinkStyled isOldStackLink linkText="Admin control panel" onClick={onItemClick} to="/admin" />
          <NavLinkStyled isOldStackLink linkText="Feature flag investigator" onClick={onItemClick} to="/flags" />
        </>
      )}
    </div>
  );
};

// Explicit zIndex to compensate for some zIndex things we've done around the app.
const zIndex = 1000;

const sidebarStyleOverrides: SidebarStyles = {
  root: { position: undefined, zIndex: `${zIndex + 1}` },
  content: { position: undefined, zIndex: `${zIndex + 1}` },
  sidebar: { background: Colors.darkHeader, zIndex: `${zIndex + 1}` },
  overlay: { zIndex: `${zIndex}` },
};

export const WhyLabsSidebar = () => {
  return (
    <WhySidebarContext.Consumer>
      {({ sidebarOpen: open, setSidebarOpen: setOpen }) => (
        // @ts-expect-error - ignore strange "Cannot be used as a JSX component" error
        <Sidebar sidebar={<SidebarContent />} open={open} onSetOpen={setOpen} styles={sidebarStyleOverrides}>
          {/* The purpose of this div is to avert the "error: children is a required element, but given as undefined" message */}
          <div />
        </Sidebar>
      )}
    </WhySidebarContext.Consumer>
  );
};
