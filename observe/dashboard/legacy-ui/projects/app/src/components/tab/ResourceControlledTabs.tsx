import { createStyles } from '@mantine/core';
import { WhyLabsControlledTabs } from 'components/design-system';
import { TABS_HEIGHT } from 'ui/constants';
import { NewCustomDashboardButton } from 'components/custom-dashboards/NewCustomDashboardButton';
import { WhyLabsControlledTabsProps } from 'components/design-system/tabs/WhyLabsControlledTabs';

const TABS_PARENT_HEIGHT = TABS_HEIGHT + 10;

const useStyles = createStyles(() => ({
  tabsParent: {
    height: TABS_PARENT_HEIGHT,
  },
  tabsPanel: {
    height: `calc(100% - ${TABS_PARENT_HEIGHT}px)`,
    padding: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
}));

type ResourceControlledTabsProps = Omit<WhyLabsControlledTabsProps, 'classNames' | 'tabsListChildren'> & {
  disableAddButtonMessage: string | null;
  isCustomDashboardFlagEnabled: boolean;
  loadingCustomDashboard: boolean;
  usedOn: `resource|${string}`;
};

export const ResourceControlledTabs = ({
  disableAddButtonMessage,
  isCustomDashboardFlagEnabled,
  loadingCustomDashboard,
  usedOn,
  ...rest
}: ResourceControlledTabsProps): JSX.Element => {
  const { classes } = useStyles();

  return (
    <WhyLabsControlledTabs
      classNames={classes}
      tabsListChildren={
        isCustomDashboardFlagEnabled && !loadingCustomDashboard ? (
          <NewCustomDashboardButton disabledWithMessage={disableAddButtonMessage} usedOn={usedOn} />
        ) : null
      }
      {...rest}
    />
  );
};
