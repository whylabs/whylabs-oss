import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { SkeletonGroup, Tab, WhyLabsTabs } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageType } from 'pages/page-types/usePageType';
import { arrayOfLength } from 'utils/arrayUtils';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { TABS_HEIGHT } from 'ui/constants';
import { DashboardsRouteResolver } from '../../route-bases/resolvers/RouteResolvers';
import { useGetOrgBasicData } from './executive-dashboard/hooks/useGetResourcesBasicData';
import {
  mapPageTypeToTabLabel,
  mapTabToNavigationPath,
  tabsOptions,
  useExecutiveDashTab,
} from './executive-dashboard/utils';
import { ExecutiveDashboard } from './executive-dashboard/ExecutiveDashboard';
import { CustomDashboards } from './custom-dashboards/CustomDashboards';

const useStyles = createStyles(() => ({
  totalContainer: {
    height: `calc(100% - ${TABS_HEIGHT}px)`,
    width: '100%',
  },
  flatDivider: {
    width: '100%',
    height: '14px',
    minHeight: '14px',
    padding: 0,
    backgroundColor: Colors.brandSecondary300,
    border: 'unset',
  },
  tabsPanel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    padding: 0,
  },
  flexRow: {
    display: 'flex',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  fakeContent: {
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  fakePadding: {
    padding: 20,
  },
  fakeGap: {
    gap: 20,
  },
}));

export const getTabsOptions = (hasModels: boolean, hasDatasets: boolean): Tab[] => {
  const tabs: Tab[] = [{ label: tabsOptions[2].label, children: <CustomDashboards /> }];

  if (hasDatasets) tabs.push({ label: tabsOptions[0].label, children: <ExecutiveDashboard /> });
  if (hasModels) tabs.push({ label: tabsOptions[1].label, children: <ExecutiveDashboard /> });
  return tabs;
};

export const DashboardsContentPage: React.FC = () => {
  const { classes, cx } = useStyles();
  const { data, loading } = useGetOrgBasicData();
  const { value: currentPath } = useExecutiveDashTab();
  const pageType = usePageType();
  const { handleNavigation } = useNavLinkHandler();
  const defaultTab = mapPageTypeToTabLabel.get(pageType) ?? 'My Dashboards';

  const [updateHtmlTitle] = useSetHtmlTitle(defaultTab);

  if (
    (!loading && currentPath === 'datasetsSummary' && !data?.hasDatasets) ||
    (!loading && currentPath === 'modelsSummary' && !data?.hasModels)
  )
    return <DashboardsRouteResolver />;

  const isExecDash = ['datasetsSummary', 'modelsSummary'].includes(currentPath);

  if (loading && isExecDash)
    return (
      <div className={classes.totalContainer}>
        <div className={classes.flexRow}>
          <SkeletonGroup count={3} height={35} width={140} ml={10} mt={8} />
        </div>
        {isExecDash ? (
          <div className={cx(classes.fakeContent, classes.fakeGap)}>
            <div className={cx(classes.flexColumn, classes.fakePadding, classes.fakeGap)} style={{ paddingBottom: 0 }}>
              {arrayOfLength(2).map((i) => (
                <div className={classes.flexRow} key={`dash-fake-row-${i}`}>
                  <SkeletonGroup count={1} height={240} width={220} mr={20} />
                  <div className={cx(classes.flexColumn, classes.fakeGap)}>
                    <SkeletonGroup count={2} height={110} width={460} mr={20} />
                  </div>
                  <SkeletonGroup count={1} height={240} style={{ flex: 1 }} />
                </div>
              ))}
            </div>
            <SkeletonGroup count={1} height="100%" width="100%" mt={2} style={{ flex: 1 }} />
          </div>
        ) : (
          <div className={classes.fakeContent}>
            <SkeletonGroup count={1} height={90} width="100%" mt={1} />
            <SkeletonGroup count={1} height={30} width="100%" mt={1} />
            <SkeletonGroup count={1} height="100%" width="100%" mt={1} />
          </div>
        )}
      </div>
    );

  const tabs = getTabsOptions(!!data?.hasModels, !!data?.hasDatasets);

  const navToTab = (value: string) => {
    const page = mapTabToNavigationPath.get(value);
    if (!page) return;
    updateHtmlTitle(value);
    handleNavigation({
      page,
    });
  };

  return (
    <div className={classes.totalContainer}>
      <WhyLabsTabs
        onTabChange={navToTab}
        defaultSelected={defaultTab}
        classNames={{
          tabsPanel: classes.tabsPanel,
        }}
        tabs={tabs}
      />
    </div>
  );
};
