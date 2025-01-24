import createStyles from '@material-ui/core/styles/createStyles';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React from 'react';

const useContentAreaStyles = makeStyles(() =>
  createStyles({
    tabContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: '100%',
      height: '100%',
    },
  }),
);

type TabPanelProps<T> = {
  readonly children?: React.ReactNode;
  readonly tabValue: T;
  readonly activeTab: T;
};
export type CreateTabContentComponentReturnType<T> = { TabContent: (props: TabPanelProps<T>) => JSX.Element | null };
/**
 * Component intended to be used with the material ui Tabs component. This is what shows
 * the actual tab content when one is selected.
 */
export function createTabContentComponent<T extends string>(): CreateTabContentComponentReturnType<T> {
  function TabContent(props: TabPanelProps<T>): JSX.Element | null {
    const { children, activeTab: value, tabValue: index } = props;
    const styles = useContentAreaStyles();

    if (value !== index) {
      return null;
    }

    return (
      <div
        className={styles.tabContent}
        role="tabpanel"
        hidden={value !== index}
        aria-labelledby={`simple-tab-${index}`}
      >
        {children}
      </div>
    );
  }

  return { TabContent };
}
