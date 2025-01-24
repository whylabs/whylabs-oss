import { Tab, Tooltip, Typography } from '@material-ui/core';
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { createStyles } from '@mantine/core';
import { Colors } from '../../constants/colors';

const DEFAULT_PADDING = '10px 10px 12px 10px';

const useTabLinkStyles = createStyles({
  tabLink: {
    borderBottom: '3px solid transparent',
    alignItems: 'center',
    color: Colors.white,
    display: 'flex',
    textDecoration: 'none',
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '14px',
    lineHeight: '24px',
    marginRight: '20px',
    opacity: 1,
    transition: 'opacity 300ms linear',

    '&:last-child': {
      marginRight: '0',
    },

    '&:hover': {
      opacity: 0.7,
    },
  },
  activeTabLink: {
    borderColor: Colors.brandPrimary500,
  },
  activeLink: {
    color: Colors.brandPrimary200,
  },
  tabRoot: {
    whiteSpace: 'nowrap',
    padding: DEFAULT_PADDING,
    minWidth: 0,
  },
  activeTabRoot: {
    fontWeight: 600,
    opacity: 1,
  },
  anchorLink: {
    padding: DEFAULT_PADDING,
    opacity: 0.7,
  },
  disabled: {
    cursor: 'default',
    color: Colors.brandSecondary600,
    height: 'fit-content',
    margin: DEFAULT_PADDING,
    fontSize: '14px',
    lineHeight: '24.5px',
  },
});

export const TabLinkContext = React.createContext<TabLinkContextProps>({ activeTab: '' });

interface TabLinkContextProps {
  readonly activeTab: string;
}
type TabLinkProps<T> = {
  readonly value: T;
  readonly to: string;
  readonly name: ReactNode;
  readonly id?: string;
  disabledTooltip?: string;
};

export type CreateTabLinkComponentReturnType<T> = { TabLink: (props: TabLinkProps<T>) => JSX.Element };

export function createTabLinkComponent<T extends string>(): CreateTabLinkComponentReturnType<T> {
  function TabLink({ value, to, name, id, disabledTooltip = '' }: TabLinkProps<T>): JSX.Element {
    const { classes, cx } = useTabLinkStyles();
    const renderTab = (isActiveTab: boolean) => {
      if (!to) {
        return (
          <Tooltip title={disabledTooltip}>
            <Typography className={classes.disabled}>{name}</Typography>
          </Tooltip>
        );
      }

      return (
        <Tab
          classes={{
            root: cx(classes.tabRoot, {
              [classes.activeTabRoot]: isActiveTab,
            }),
          }}
          label={name}
        />
      );
    };
    return (
      <TabLinkContext.Consumer>
        {({ activeTab }) => {
          const isActiveTab = activeTab === value;

          const tabElement = renderTab(isActiveTab);
          if (!to) return tabElement;

          const tabDefaultClass = cx(classes.tabLink, {
            [classes.activeTabLink]: isActiveTab,
          });

          // If the link is external, use an anchor tag
          if (to.startsWith('https://') || to.startsWith('http://')) {
            return (
              <a className={cx(tabDefaultClass, classes.anchorLink)} href={to} id={id}>
                {name}
              </a>
            );
          }

          return (
            <Link
              className={cx(tabDefaultClass, {
                [classes.activeLink]: isActiveTab,
              })}
              id={id}
              to={to}
            >
              {tabElement}
            </Link>
          );
        }}
      </TabLinkContext.Consumer>
    );
  }

  return { TabLink };
}
