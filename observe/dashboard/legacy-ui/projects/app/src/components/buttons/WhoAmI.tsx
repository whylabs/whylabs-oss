import { createStyles, Menu } from '@mantine/core';
import { IconUserCircle } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { LabelCopyAction } from 'components/label-copy-action/LabelCopyAction';
import { useAuthNavigationHandler } from 'hooks/usePageLinkHandler';
import { useUserContext } from 'hooks/useUserContext';
import { ReactNode } from 'react';
import { CurrentUser } from 'types/userTypes';
import { WhyLabsActionIcon, WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  menuButton: {
    backgroundColor: Colors.secondaryLight1000,
    border: `1px solid ${Colors.secondaryLight1000}`,
    borderRadius: 4,
    color: Colors.white,
    height: 30,
    width: 30,

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

type MenuItemType = {
  classNames: {
    label?: string;
    menu?: string;
  };
  id: string;
  label: string | ReactNode;
  onClick?: () => void;
  withDivider?: boolean;
};

const WhoAmI = (): JSX.Element => {
  const { classes, cx } = useStyles();
  const { getCurrentUser, loading } = useUserContext();
  const { triggerLogout, triggerLogin } = useAuthNavigationHandler();
  const user = getCurrentUser();

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
        <WhyLabsActionIcon className={classes.menuButton} label="User menu">
          <IconUserCircle size={30} strokeWidth={1} />
        </WhyLabsActionIcon>
      </Menu.Target>
      {renderMenu()}
    </Menu>
  );

  function renderMenu() {
    if (loading) {
      return null;
    }

    return <Menu.Dropdown>{getMenuItems().map(renderMenuItem)}</Menu.Dropdown>;
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
          label: renderUserOrgText(user),
          withDivider: true,
        });
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

  function renderUserOrgText(person: CurrentUser): JSX.Element | null {
    if (!person?.organization) {
      return null;
    }

    const orgName = person.organization.name;
    const orgId = person.organization.id;
    const personRole = person.role ? ` (${person.role})` : '';
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

export default WhoAmI;
