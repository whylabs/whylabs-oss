import { Tabs, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactNode, createContext } from 'react';
import { Link } from 'react-router-dom';

import WhyLabsText from '../text/WhyLabsText';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

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
    fontSize: 14,
    lineHeight: 24,
    marginRight: 20,
    opacity: 0.7,
    transition: 'opacity 300ms linear',

    '&:last-child': {
      marginRight: '0',
    },

    '&:hover': {
      opacity: 0.5,
    },
  },
  activeTabLink: {
    borderColor: Colors.brandPrimary500,
    opacity: 1,

    '&:hover': {
      opacity: 0.7,
    },
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
    color: `${Colors.brandPrimary200}!important`,

    '& button': {
      color: `${Colors.brandPrimary200}!important`,
    },

    '&[data-active]': {
      borderColor: `${Colors.brandPrimary500}!important`,
    },
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
    fontSize: 14,
    lineHeight: '24.5px',
  },
});

type TabLinkContextProps = {
  readonly activeTab: string;
};
export const TabLinkContext = createContext<TabLinkContextProps>({ activeTab: '' });

export type TabLinkProps<T> = {
  readonly value: T;
  readonly to: string;
  readonly name: ReactNode;
  readonly id?: string;
  disabledTooltip?: string;
};

export type CreateTabLinkComponentReturnType<T> = { TabLink: (props: TabLinkProps<T>) => JSX.Element };

export function createTabLinkComponent<T extends string>(): CreateTabLinkComponentReturnType<T> {
  const TabLink = ({ value, to, name, id, disabledTooltip = '' }: TabLinkProps<T>): JSX.Element => {
    const { classes, cx } = useTabLinkStyles();
    const renderTab = (isActiveTab: boolean) => {
      if (!to) {
        return (
          <WhyLabsTooltip label={disabledTooltip}>
            <WhyLabsText className={classes.disabled}>{name}</WhyLabsText>
          </WhyLabsTooltip>
        );
      }

      return (
        <Tabs.Tab
          className={cx(classes.tabRoot, {
            [classes.activeTabRoot]: isActiveTab,
          })}
          value={value}
        >
          {name}
        </Tabs.Tab>
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
  };

  return { TabLink };
}
