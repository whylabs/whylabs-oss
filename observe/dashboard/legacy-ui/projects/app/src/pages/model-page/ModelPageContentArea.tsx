import { useGetDataExistenceInformationQuery, useGetModelDataAvailabilityQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import ModelNotFoundPage from 'pages/model-not-found/ModelNotFound';
import { NoDataSegmentsPage } from 'pages/no-data-message-page/NoDataSegmentsPage';
import { NoOutputDataPage } from 'pages/no-data-message-page/NoOutputDataPage';
import MonitorManagerControlPanel from 'components/panels/monitoring/monitor-manager/MonitorManagerControlPanel';
import { ErrorBoundary } from 'react-error-boundary';
import SectionErrorFallback from 'pages/errors/boundaries/SectionErrorFallback';
import { NoDataMessagePage } from 'pages/no-data-message-page/NoDataMessagePage';
import { LLMDashboardsView } from 'pages/llm-dashboards/LLMDashboardsView';
import { useCallback, useMemo } from 'react';
import { Extends } from 'types/genericTypes';
import { createStyles } from '@mantine/core';
import { ModelOutputTable } from './ModelOutputTable';
import { ModelPageMonitoringTabContent } from './ModelPageMonitoringTabContent';
import { TabContent, useModelPageTab } from './ModelPageTabBarArea';
import { ModelSummaryTabContent } from './model-summary-page/ModelSummaryTabContent';
import ModelPageSegmentsTabContent from './model-segments/ModelPageSegmentsTabContent';
import { ModelPageProfilesTabContent } from './ModelPageProfilesTabContent';
import { useResourceContext } from './hooks/useResourceContext';
import { ModelPageTabs } from './hooks/useModelPageTabs';
import { ResourceDashboardsView } from '../resource-dashboards/ResourceDashboardsView';
import { ProfilesPageContextProvider } from './context/ProfilesPageContext';

const useContentAreaStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flexGrow: 1,
  },
});

interface ModelPageTabItem {
  pageType: Extends<
    ModelPageTabs,
    | 'inputs'
    | 'outputs'
    | 'dataProfile'
    | 'segments'
    | 'monitorManager'
    | 'summary'
    | 'llmDashboards'
    | 'resourceDashboards'
  >;
  component: JSX.Element;
}

export function ModelPageContentArea(): JSX.Element {
  const { classes: styles } = useContentAreaStyles();
  const activeTab = useModelPageTab();
  const {
    resourceState: { resource },
  } = useResourceContext();
  const { modelId } = usePageTypeWithParams();

  const { data: dataAvailability, loading: dataAvailabilityLoading } = useGetModelDataAvailabilityQuery({
    variables: { modelId },
  });
  const dataIsAvailable = dataAvailabilityLoading || Boolean(dataAvailability?.model?.dataAvailability?.hasData);
  const modelExists = dataAvailability?.model !== null;
  const { data: checkData, loading: checkLoading } = useGetDataExistenceInformationQuery({
    variables: { datasetId: modelId },
    skip: !resource,
  });
  const showNoSegmentData = !checkLoading && checkData?.model?.totalSegments === 0;
  const showNoOutputs = !checkLoading && !checkData?.model?.entitySchema?.hasOutputs;

  const tabContentComponents: ModelPageTabItem[] = useMemo(
    () => [
      {
        pageType: 'monitorManager',
        component: <MonitorManagerControlPanel />,
      },
      {
        pageType: 'inputs',
        component: <ModelPageMonitoringTabContent />,
      },
      {
        pageType: 'outputs',
        component: showNoOutputs ? (
          <NoOutputDataPage />
        ) : (
          <div className={styles.root}>
            <ModelOutputTable />
          </div>
        ),
      },
      {
        pageType: 'dataProfile',
        component: (
          <ProfilesPageContextProvider>
            <ModelPageProfilesTabContent />
          </ProfilesPageContextProvider>
        ),
      },
      {
        pageType: 'segments',
        component: showNoSegmentData ? <NoDataSegmentsPage /> : <ModelPageSegmentsTabContent />,
      },
      {
        pageType: 'summary',
        component: <ModelSummaryTabContent />,
      },
      {
        pageType: 'llmDashboards',
        component: <LLMDashboardsView />,
      },
      {
        pageType: 'resourceDashboards',
        component: <ResourceDashboardsView />,
      },
    ],
    [showNoOutputs, showNoSegmentData, styles.root],
  );

  const renderContent = useCallback(
    (item: ModelPageTabItem) => {
      if (!modelExists)
        return (
          <div style={{ position: 'absolute', top: 0, right: 0, left: 0, bottom: 0 }}>
            <ModelNotFoundPage />
          </div>
        );

      const isInputsPage = item.pageType === 'inputs';
      if (!dataIsAvailable && isInputsPage) return <NoDataMessagePage />;
      return item.component;
    },
    [dataIsAvailable, modelExists],
  );

  return (
    <div className={styles.root}>
      <ErrorBoundary FallbackComponent={SectionErrorFallback}>
        {tabContentComponents.map((tabItem) => (
          <TabContent activeTab={activeTab} key={tabItem.pageType} tabValue={tabItem.pageType}>
            {renderContent(tabItem)}
          </TabContent>
        ))}
      </ErrorBoundary>
    </div>
  );
}
