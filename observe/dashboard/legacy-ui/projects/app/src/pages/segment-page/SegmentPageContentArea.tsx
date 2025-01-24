import { MODEL_PAGE_TAB_BAR_HEIGHT } from 'pages/model-page/ModelPageTabBarArea';
import { GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import { useGetDataExistenceInformationQuery, useGetDatasetNameQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import ModelNotFoundPage from 'pages/model-not-found/ModelNotFound';
import { createStyles } from '@mantine/core';
import { ModelPageProfilesTabContent } from 'pages/model-page/ModelPageProfilesTabContent';
import { SegmentOutputTable } from './SegmentOutputTable';
import { SegmentPageMonitoringTabContent } from './SegmentPageMonitoringTabContent';
import { TabContent, useSegmentPageTab } from './SegmentPageTabBarArea';
import { ResourceDashboardsView } from '../resource-dashboards/ResourceDashboardsView';
import { ProfilesPageContextProvider } from '../model-page/context/ProfilesPageContext';
import { NoOutputDataPage } from '../no-data-message-page/NoOutputDataPage';

const useContentAreaStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: `calc(100vh - ${MODEL_PAGE_TAB_BAR_HEIGHT}px - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
  },
});

export function SegmentPageContentArea(): JSX.Element {
  const { classes: styles } = useContentAreaStyles();
  const activeTab = useSegmentPageTab();
  const { modelId } = usePageTypeWithParams();
  const { data, loading } = useGetDatasetNameQuery({ variables: { datasetId: modelId } });
  const { data: checkData, loading: checkLoading } = useGetDataExistenceInformationQuery({
    variables: { datasetId: modelId },
    skip: !modelId,
  });
  const showNoOutputs = !checkLoading && !checkData?.model?.entitySchema?.hasOutputs;
  const modelDoesNotExist = !loading && data?.model === null;
  if (modelDoesNotExist) {
    return <ModelNotFoundPage />;
  }

  return (
    <div className={styles.root}>
      <TabContent activeTab={activeTab} tabValue="inputs">
        <SegmentPageMonitoringTabContent />
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="outputs">
        {showNoOutputs ? <NoOutputDataPage /> : <SegmentOutputTable />}
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="segmentDataProfile">
        <ProfilesPageContextProvider>
          <ModelPageProfilesTabContent />
        </ProfilesPageContextProvider>
      </TabContent>
      <TabContent activeTab={activeTab} tabValue="resourceDashboards">
        <ResourceDashboardsView />
      </TabContent>
    </div>
  );
}
