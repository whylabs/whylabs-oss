import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import {
  GLOBAL_TAB_BAR_HEIGHT,
  GLOBAL_TITLE_BAR_HEIGHT,
  GlobalTitleBar,
} from 'components/controls/widgets/GlobalTitleBar';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { memo } from 'react';
import { createStyles } from '@mantine/core';
import { ResourceOverviewPageTabBarArea, TabContent } from './ResourceOverviewPageTabBarArea';
import { ResourceOverviewPageContentArea } from './ResourceOverviewPageContentArea';
import { DashboardsContentPage } from './dashboards/DashboardsContentPage';
import { useDashboardPageTab } from './useDashboardPageTabs';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: `calc(100vh - ${GLOBAL_TAB_BAR_HEIGHT}px - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
  },
});
export const ResourceOverviewPage = memo(() => {
  const { classes } = useStyles();
  const activeTab = useDashboardPageTab();
  const contentArea = (
    <div className={classes.root}>
      <TabContent activeTab={activeTab} tabValue="overview">
        <ResourceOverviewPageContentArea />
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="exec-dash">
        <DashboardsContentPage />
      </TabContent>
    </div>
  );

  return (
    <TitleAndContentTemplate
      BannerComponent={<GlobalBanner />}
      TitleBarAreaComponent={<GlobalTitleBar />}
      TabBarComponent={<ResourceOverviewPageTabBarArea />}
      ContentAreaComponent={contentArea}
    />
  );
});
