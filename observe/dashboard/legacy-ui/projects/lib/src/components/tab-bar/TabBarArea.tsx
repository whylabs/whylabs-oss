import { Tabs } from '@material-ui/core';
import React from 'react';
import { createStyles } from '@mantine/core';
import { createTabContentComponent, CreateTabContentComponentReturnType } from './TabContent';
import { createTabLinkComponent, TabLinkContext, CreateTabLinkComponentReturnType } from './TabLink';

const useTabHeaderStyles = createStyles({
  tabRoot: {
    display: 'flex',
    flexDirection: 'column', // probably does nothing
    justifyContent: 'center',
    padding: '0 10px',
    overflowX: 'auto',
    '& .MuiTab-wrapper': {
      fontWeight: 300,
    },
  },
  tabsRoot: {
    width: 'max-content',
    '& [role="tablist"]': {
      alignItems: 'center',
    },
  },
  indicator: {
    display: 'none',
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
  function TabBarArea(props: TabBarAreaProps<T>) {
    const { activeTab, children } = props;
    const { classes: styles } = useTabHeaderStyles();

    return (
      <div className={styles.tabRoot}>
        <TabLinkContext.Provider value={{ activeTab }}>
          <Tabs
            classes={{ root: styles.tabsRoot, indicator: styles.indicator }}
            indicatorColor={undefined}
            value={activeTab}
          >
            {children}
          </Tabs>
        </TabLinkContext.Provider>
      </div>
    );
  }

  return { TabBarArea, ...createTabLinkComponent<T>(), ...createTabContentComponent<T>() };
}
