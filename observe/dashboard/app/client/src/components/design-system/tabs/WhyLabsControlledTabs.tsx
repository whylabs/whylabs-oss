import { Tabs, TabsProps, createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { NullableString } from '~/types/genericTypes';
import { ReactNode } from 'react';

const useStyles = createStyles(() => ({
  activeTab: {
    background: Colors.white,
  },
  tabsPanel: {
    padding: '20px 0',
  },
  tabLabel: {
    ref: getStylesRef('tabLabel'),
    color: Colors.brandSecondary900,
    fontWeight: 400,
    fontSize: '15px',
    lineHeight: 0.93,
  },
  tab: {
    [`&[data-active="true"] .${getStylesRef('tabLabel')}`]: {
      color: 'black',
    },
  },
}));

export type Tab = {
  children?: ReactNode;
  id?: string;
  label: string;
};

export type WhyLabsControlledTabsProps = {
  activeTab?: NullableString;
  classNames?: {
    root?: string;
    tabsList?: string;
    tabsPanel?: string;

    tabLabel?: string;
  };
  tabs: Tab[];
  onTabChange: NonNullable<TabsProps['onTabChange']>;
};

export const WhyLabsControlledTabs = ({
  activeTab,
  classNames,
  onTabChange,
  tabs,
}: WhyLabsControlledTabsProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  if (!tabs.length) return null;

  const value = activeTab || tabs?.[0]?.label;
  return (
    <Tabs
      data-testid="WhyLabsControlledTabs"
      keepMounted={false}
      onTabChange={onChange}
      radius="sm"
      value={value}
      variant="outline"
      classNames={{
        tabLabel: cx(classes.tabLabel, classNames?.tabLabel),
        tab: classes.tab,
        root: classNames?.root,
      }}
    >
      <Tabs.List className={classNames?.tabsList}>
        {tabs.map(({ label, id }) => (
          <Tabs.Tab
            className={cx({
              [classes.activeTab]: activeTab === label,
            })}
            key={label}
            value={label}
            id={id}
          >
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map(({ label, children }) => (
        <Tabs.Panel className={cx(classes.tabsPanel, classNames?.tabsPanel)} key={label} value={label}>
          {children}
        </Tabs.Panel>
      ))}
    </Tabs>
  );

  function onChange(key: string) {
    onTabChange(key);
  }
};
