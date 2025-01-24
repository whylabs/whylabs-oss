import { Tabs, TabsProps, createStyles, getStylesRef } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { Colors } from '@whylabs/observatory-lib';
import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { NullableString } from 'types/genericTypes';
import { TABS_HEIGHT } from 'ui/constants';
import { isNumber } from 'utils/typeGuards';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

const TAB_VERTICAL_PADDING = 0;
const TAB_HORIZONTAL_PADDING = 8;
const TABS_LIST_PARENT_BOTTOM_ADJUSTMENT = 1;

type StyleProps = {
  tabMaxWidth?: CSSProperties['maxWidth'];
};

const useStyles = createStyles((_, { tabMaxWidth }: StyleProps) => ({
  activeTab: {
    background: Colors.white,
  },
  tabsParent: {
    alignItems: 'center',
    borderBottom: '0.0625rem solid #dee2e6',
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    height: TABS_HEIGHT,
    padding: `0 10px`,
    justifyContent: 'space-between',
    position: 'relative',
  },
  tabsPanel: {
    padding: '20px 0',
  },
  tabLabel: {
    color: Colors.brandSecondary900,
    lineHeight: 'normal',
    fontSize: '15px',
    fontWeight: 400,
    overflow: 'hidden',
    ref: getStylesRef('tabLabel'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tabsListParent: {
    alignSelf: 'flex-end',
    marginBottom: -TABS_LIST_PARENT_BOTTOM_ADJUSTMENT,
    overflow: 'hidden',
    width: '100%',
  },
  tabsList: {
    border: 'none',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    width: '100%',

    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      width: 0,
    },
  },
  tab: {
    height: 36,
    maxWidth: tabMaxWidth,
    padding: `${TAB_VERTICAL_PADDING}px ${TAB_HORIZONTAL_PADDING}px`,
    paddingTop: TAB_VERTICAL_PADDING - TABS_LIST_PARENT_BOTTOM_ADJUSTMENT,

    [`&[data-active="true"] .${getStylesRef('tabLabel')}`]: {
      color: 'black',
    },
  },
  root: {
    height: '100%',
  },
}));

export type Tab = {
  disabled?: boolean;
  children?: ReactNode;
  label: string;
  value?: string;
};

export type WhyLabsControlledTabsProps = {
  activeTab?: NullableString;
  classNames?: {
    root?: string;
    tabsParent?: string;
    tabsListParent?: string;
    tabsList?: string;
    tabsPanel?: string;
  };
  id?: string;
  tabs: Tab[];
  tabsListChildren?: ReactNode;
  onTabChange: NonNullable<TabsProps['onTabChange']>;
};

export const WhyLabsControlledTabs = ({
  activeTab,
  classNames,
  id,
  onTabChange,
  tabs,
  tabsListChildren,
}: WhyLabsControlledTabsProps): JSX.Element | null => {
  const [tabMaxWidth, setTabMaxWidth] = useState<StyleProps['tabMaxWidth']>('max-content');

  const { classes, cx } = useStyles({ tabMaxWidth });

  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const { width: tabsListWidth, ref: tabsListContainerRef } = useElementSize();

  useEffect(() => {
    tabsRef.current = tabsRef.current.slice(0, tabs.length);
  }, [tabs.length]);

  useEffect(() => {
    // Can't really do the calculations until the tabs list container ref is available
    if (!tabsListContainerRef.current || !tabs.length) return;

    let maxWidthForTabs = tabsListWidth / tabs.length;
    let countTabsSmallerThanMaxWidth = 0;
    let totalTabsWidth = 0;

    tabsRef.current.forEach((t) => {
      const tabWidth = t?.offsetWidth || 0;

      if (tabWidth < maxWidthForTabs) {
        countTabsSmallerThanMaxWidth += 1;
        totalTabsWidth += tabWidth;
      }
    });

    // If there are tabs that are smaller than the max width,
    // give the remaining space to larger tabs
    if (countTabsSmallerThanMaxWidth) {
      const availableWidth = tabsListWidth - totalTabsWidth;
      const totalTabsToAdjust = tabs.length - countTabsSmallerThanMaxWidth;

      if (totalTabsToAdjust > 0 && availableWidth) {
        // Distribute the remaining space to the tabs that are larger than the max width
        maxWidthForTabs = availableWidth / totalTabsToAdjust;
      }
    }

    setTabMaxWidth(Math.floor(maxWidthForTabs));
  }, [tabsListContainerRef, tabsListWidth, tabs.length]);

  if (!tabs.length) return null;

  const tabsValue = activeTab || getTabValue(tabs[0]);

  const tabsListElement = (() => {
    const renderedTabs = (
      <div className={cx(classes.tabsListParent, classNames?.tabsListParent)}>
        <Tabs.List className={cx(classes.tabsList, classNames?.tabsList)} ref={tabsListContainerRef}>
          {tabs.map((tab, index) => {
            const { disabled, label } = tab;
            const value = getTabValue(tab);

            const tabWidth = tabsRef.current[index]?.offsetWidth || 0;

            const renderWithTooltip = isNumber(tabMaxWidth) ? tabWidth >= Math.floor(tabMaxWidth) : false;

            return (
              <Tabs.Tab
                aria-disabled={disabled}
                className={cx({
                  [classes.activeTab]: tabsValue === value,
                })}
                disabled={disabled}
                key={label}
                // eslint-disable-next-line no-return-assign
                ref={(el) => (tabsRef.current[index] = el)}
                value={value}
              >
                {renderWithTooltip ? <WhyLabsTooltip label={label}>{label}</WhyLabsTooltip> : label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </div>
    );

    return (
      <div className={cx(classes.tabsParent, classNames?.tabsParent)}>
        {renderedTabs}
        {tabsListChildren}
      </div>
    );
  })();

  return (
    <Tabs
      data-testid="WhyLabsControlledTabs"
      id={id}
      keepMounted={false}
      onTabChange={onTabChange}
      radius="sm"
      value={tabsValue}
      variant="outline"
      classNames={{
        tabLabel: cx(classes.tabLabel),
        tab: classes.tab,
        root: cx(classes.root, classNames?.root),
      }}
    >
      {tabsListElement}
      {tabs.map((tab) => (
        <Tabs.Panel className={cx(classes.tabsPanel, classNames?.tabsPanel)} key={tab.label} value={getTabValue(tab)}>
          {tab.children}
        </Tabs.Panel>
      ))}
    </Tabs>
  );

  function getTabValue(tab: Tab): string {
    return tab.value || tab.label;
  }
};
