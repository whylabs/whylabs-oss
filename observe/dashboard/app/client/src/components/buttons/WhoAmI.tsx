// Not sure why but eslint thinks that MenuItemType are unused
/* eslint-disable react/no-unused-prop-types */

import { Menu, createStyles } from '@mantine/core';
import { IconUserCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { useAuthNavigationHandler } from '~/hooks/useAuthNavigationHandler';
import { useUserContext } from '~/hooks/useUserContext';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { VALID_BILLING_TIERS } from '~/routes/:orgId/settings/useSettingsRootViewModel';
import { canManageOrg } from '~/utils/permissionUtils';
import { ReactNode } from 'react';

import { WhyLabsActionIcon, WhyLabsText } from '../design-system';
import { LabelCopyAction } from './LabelCopyAction';

const useStyles = createStyles({
  menuButton: {
    backgroundColor: Colors.secondaryLight1000,
    border: `1px solid ${Colors.secondaryLight1000}`,
    borderRadius: 4,
    color: Colors.white,

    '&:hover': {
      backgroundColor: 'rgba(54, 155, 172, 0.04)',
    },
  },
  dropdown: {
    minWidth: 200,
    padding: 0,
    paddingTop: 8,
    width: 'max-content',
  },
  divider: {
    margin: 0,
  },
  clickable: {
    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
    cursor: 'pointer',
  },
  unclickable: {
    '&:hover': {
      backgroundColor: Colors.transparent,
    },
    cursor: 'auto',
  },
  menuItem: {
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingTop: 0,
    paddingBottom: 0,
  },
  separatedItem: {
    marginTop: '10px',
    marginBottom: '10px',
  },
  singleItem: {
    paddingTop: '10px',
    paddingBottom: '10px',
  },
  bottomItem: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
  },
  nameText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: Colors.secondaryLight1000,
    fontWeight: 500,
  },
  orgHeaderText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: Colors.brandSecondary600,
    fontWeight: 500,
    marginBottom: 5,
  },
  orgText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: Colors.secondaryLight1000,
    fontWeight: 400,
  },
  secondaryText: {
    fontSize: 12,
    color: Colors.brandSecondary600,
    lineHeight: 1.5,
    fontWeight: 400,
  },
  emailText: {
    paddingBottom: 5,
  },
});

export type MenuItemType = {
  classNames: {
    label?: string;
    menu?: string;
  };
  id: string;
  label: string | ReactNode;
  onClick?: () => void;
  withDivider?: boolean;
};

export const WhoAmI = () => {
  const { classes, cx } = useStyles();
  const { currentUser: user } = useUserContext();
  const { triggerLogout, triggerLogin } = useAuthNavigationHandler();
  const { handleNavigation } = useNavLinkHandler();

  return (
    <Menu
      classNames={{
        divider: classes.divider,
        dropdown: classes.dropdown,
      }}
      offset={4}
      position="bottom-end"
      shadow="md"
    >
      <Menu.Target>
        <WhyLabsActionIcon className={classes.menuButton} label="User menu" size={30}>
          <IconUserCircle size={30} strokeWidth={1} />
        </WhyLabsActionIcon>
      </Menu.Target>
      {renderMenu()}
    </Menu>
  );

  function renderMenu() {
    return <Menu.Dropdown>{getMenuItems().map(renderMenuItem)}</Menu.Dropdown>;
  }

  function canSeeBilling(): boolean {
    if (!user?.organization?.subscriptionTier) {
      return false;
    }
    return VALID_BILLING_TIERS.includes(user.organization.subscriptionTier) && canManageOrg(user);
  }

  function getMenuItems() {
    const menus: MenuItemType[] = [
      {
        classNames: {
          label: classes.nameText,
          menu: cx(classes.menuItem, classes.unclickable),
        },
        id: 'user-name',
        label: user?.isAuthenticated ? user.name ?? '-' : 'Not logged in',
      },
    ];

    if (user?.isAuthenticated) {
      menus.push({
        classNames: {
          label: cx(classes.emailText, classes.secondaryText),
          menu: cx(classes.menuItem, classes.unclickable),
        },
        id: 'user-email',
        label: user.email,
        withDivider: true,
      });

      if (user.organization) {
        menus.push({
          classNames: {
            menu: cx(classes.menuItem, classes.unclickable, classes.separatedItem),
          },
          id: 'user-org',
          label: renderUserOrgText(),
          withDivider: true,
        });
        if (canSeeBilling()) {
          menus.push({
            classNames: {
              label: classes.orgText,
              menu: cx(classes.menuItem, classes.singleItem, classes.clickable),
            },
            id: 'billing-icon-click',
            label: 'Billing',
            onClick: () => {
              handleNavigation({ page: 'settings', settings: { path: 'billing' } });
            },
            withDivider: true,
          });
        }
      }

      menus.push({
        classNames: {
          label: classes.orgText,
          menu: cx(classes.bottomItem, classes.clickable),
        },
        id: 'logout-icon-click',
        label: 'Sign out',
        onClick: triggerLogout,
      });
    } else {
      menus.push({
        classNames: {
          label: classes.orgText,
          menu: cx(classes.bottomItem, classes.clickable),
        },
        id: 'login-icon-click',
        label: 'Sign in',
        onClick: () => triggerLogin(undefined),
      });
    }

    return menus;
  }

  function renderMenuItem({ classNames, id, label, onClick, withDivider }: MenuItemType) {
    const menuElement = (
      <Menu.Item className={classNames.menu} id={id} key={id} onClick={onClick}>
        {typeof label === 'string' ? (
          <WhyLabsText inherit className={classNames.label}>
            {label}
          </WhyLabsText>
        ) : (
          label
        )}
      </Menu.Item>
    );

    if (withDivider) {
      return [menuElement, <Menu.Divider key={`${id}-divider`} />];
    }

    return menuElement;
  }

  function renderUserOrgText() {
    if (!user?.organization) {
      return null;
    }

    const orgName = user.organization.name;
    const orgId = user.organization.id;
    const personRole = user.role ? ` (${user.role})` : '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <WhyLabsText inherit className={classes.orgHeaderText}>
          CURRENT ORG
        </WhyLabsText>
        <WhyLabsText inherit className={classes.orgText}>{`${orgName}${personRole}`}</WhyLabsText>
        <LabelCopyAction label={`Org ID: ${orgId}`} value={orgId} overrideToastText="Org ID copied to clipboard!" />
      </div>
    );
  }
};
