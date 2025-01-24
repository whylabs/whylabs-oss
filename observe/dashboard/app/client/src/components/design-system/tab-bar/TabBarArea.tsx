import { Tabs, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import React, { useMemo } from 'react';

import { CreateTabContentComponentReturnType, createTabContentComponent } from './TabContent';
import { CreateTabLinkComponentReturnType, TabLinkContext, createTabLinkComponent } from './TabLink';

const useTabHeaderStyles = createStyles({
  root: {
    marginBottom: -10,
  },
  tabsList: {
    border: 'none',
  },
  tab: {
    borderBottom: '2px solid transparent',
    color: Colors.white,
    fontWeight: 300,
    height: 50,

    '&:hover': {
      borderColor: 'transparent',
      backgroundColor: 'inherit',
    },
  },
});

/**
 * Create typesafe TabBarArea and TabLink components that will ensure the tab values
 * are correct and consistent at compile time. Use as follows:
 *
 *     type SegmentPageTabs = 'input' | 'alerts' | 'configuration';
 *     const { TabBarArea, TabLink } = createTabBarComponents<SegmentPageTabs>();
 *
 *     <TabBarArea activeTab={activeTab}>
 *       <TabLink value="input" to="..." name="Monitoring" />
 *       <TabLink value="alerts" to="..." name="Alert feed" />
 *       <TabLink value="configuration" to="..." name="Segment config" />
 *     </TabBarArea>
 */
type TabBarAreaProps<T> = {
  readonly activeTab: T;
  readonly children: React.ReactNode;
};

type CreateTabBarComponentReturnType<T> = CreateTabLinkComponentReturnType<T> &
  CreateTabContentComponentReturnType<T> & {
    TabBarArea: (props: TabBarAreaProps<T>) => JSX.Element;
  };

export function createTabBarComponents<T extends string>(): CreateTabBarComponentReturnType<T> {
  const TabBarArea = (props: TabBarAreaProps<T>) => {
    const { activeTab, children } = props;
    const { classes } = useTabHeaderStyles();

    const value = useMemo(() => ({ activeTab }), [activeTab]);

    return (
      <TabLinkContext.Provider value={value}>
        <Tabs classNames={classes} keepMounted={false} value={activeTab}>
          <Tabs.List>{children}</Tabs.List>
        </Tabs>
      </TabLinkContext.Provider>
    );
  };

  return { TabBarArea, ...createTabLinkComponent<T>(), ...createTabContentComponent<T>() };
}
