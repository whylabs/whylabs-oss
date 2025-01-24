import { createStyles } from '@mantine/core';
import { Tab, WhyLabsLoadingOverlay } from 'components/design-system';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { LLMDashboardsPath, UniversalNavigationParams, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import {
  TEMP_COMPARED_END_DATE_RANGE,
  TEMP_COMPARED_RANGE_PRESET,
  TEMP_COMPARED_START_DATE_RANGE,
} from 'types/navTags';
import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { LOADING_CUSTOM_DASHBOARDS_TAB_LABEL, useResourceCustomDashboard } from 'hooks/useResourceCustomDashboard';
import { ResourceCustomDashboard } from 'components/custom-dashboards/ResourceCustomDashboard';
import { PageType } from 'pages/page-types/pageType';
import { ResourceControlledTabs } from 'components/tab/ResourceControlledTabs';
import { LLMSecurityDashboard } from './components/tab-contents/security/SecurityPanel';
import { DashboardTabsContextProvider } from './DashboardTabsContext';
import { LLMPerformanceDashboard } from './components/tab-contents/performance/PerformancePanel';
import { InsightsAndEventsDrawer } from './components/InsightsAndEventsDrawer';
import { SegmentAnalysisPage } from '../segment-analysis/SegmentAnalysis';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingTabPanel: {
    position: 'relative',
    width: '100%',
  },
}));

const SECURITY_TAB_VALUE = 'security';
const PERFORMANCE_TAB_VALUE = 'performance';
const SEGMENT_ANALYSIS_TAB_VALUE = 'segment-analysis';

const mapTabToNavigationPath = new Map<PageType, LLMDashboardsPath>([
  ['llmSecurityDashboard', SECURITY_TAB_VALUE],
  ['segmentLlmDashboards', SECURITY_TAB_VALUE],
  ['llmPerformanceDashboard', PERFORMANCE_TAB_VALUE],
  ['segmentLlmPerformanceDashboard', PERFORMANCE_TAB_VALUE],
  ['llmSegmentAnalysisDashboard', SEGMENT_ANALYSIS_TAB_VALUE],
]);

export const LLMDashboardsView: React.FC = () => {
  const { classes } = useStyles();
  const { pageType, modelId, segment } = usePageTypeWithParams();
  const params = useParams();
  const { handleNavigation } = useNavLinkHandler();

  const onDeleteDashboard = useCallback(() => {
    handleNavigation({
      modelId,
      page: 'dashboards',
      segmentTags: segment,
      saveParams: [TEMP_COMPARED_START_DATE_RANGE, TEMP_COMPARED_END_DATE_RANGE, TEMP_COMPARED_RANGE_PRESET],
    });
  }, [handleNavigation, modelId, segment]);

  const selectedDashboardId = params['*'];
  const {
    activeDashboardLabel,
    dashboards: customDashboards,
    dashboardsIds: customDashboardsIds,
    disableAddButtonMessage,
    loading: loadingCustomDashboard,
    usedOn,
  } = useResourceCustomDashboard({ onDeleteCallback: onDeleteDashboard, resourceId: modelId, selectedDashboardId });

  const isCustomDashboard = ['llmCustomDashboard', 'segmentLlmCustomDashboard'].includes(pageType);

  const activeTab = (() => {
    if (isCustomDashboard && activeDashboardLabel) return selectedDashboardId;
    return mapTabToNavigationPath.get(pageType) ?? SECURITY_TAB_VALUE;
  })();

  const navToTab = (value: string) => {
    const commonParams: UniversalNavigationParams = {
      modelId,
      page: 'dashboards',
      segmentTags: segment,
      saveParams: [TEMP_COMPARED_START_DATE_RANGE, TEMP_COMPARED_END_DATE_RANGE, TEMP_COMPARED_RANGE_PRESET],
    };

    // Special handler for custom dashboards
    if (customDashboardsIds.includes(value)) {
      handleNavigation({
        ...commonParams,
        // @ts-expect-error - We are using the dashboard id as a dynamic key here
        dashboards: { path: value },
      });
      return;
    }

    if (!value) return;

    handleNavigation({
      ...commonParams,
      dashboards: { path: value as LLMDashboardsPath },
    });
  };

  const tabs = (() => {
    let tabsList: Tab[] = [
      {
        children: <LLMSecurityDashboard />,
        label: 'Security',
        value: SECURITY_TAB_VALUE,
      },
      {
        children: <LLMPerformanceDashboard />,
        label: 'Performance',
        value: PERFORMANCE_TAB_VALUE,
      },
      {
        children: <SegmentAnalysisPage />,
        label: 'Segment Analysis',
        value: SEGMENT_ANALYSIS_TAB_VALUE,
      },
    ];

    if (isCustomDashboard && loadingCustomDashboard && !customDashboards.length) {
      tabsList.push({
        children: (
          <div className={classes.loadingTabPanel}>
            <WhyLabsLoadingOverlay visible />
          </div>
        ),
        disabled: true,
        label: LOADING_CUSTOM_DASHBOARDS_TAB_LABEL,
      });
    }
    if (customDashboards.length) {
      tabsList = [
        ...tabsList,
        ...customDashboards.map((dashboard) => ({
          children: <ResourceCustomDashboard dashboard={dashboard} />,
          label: dashboard.displayName,
          value: dashboard.id,
        })),
      ];
    }

    return tabsList;
  })();

  return (
    <DashboardTabsContextProvider>
      <ResourceControlledTabs
        activeTab={activeTab}
        disableAddButtonMessage={disableAddButtonMessage}
        isCustomDashboardFlagEnabled
        loadingCustomDashboard={loadingCustomDashboard}
        onTabChange={navToTab}
        tabs={tabs}
        usedOn={usedOn}
      />
      <InsightsAndEventsDrawer />
    </DashboardTabsContextProvider>
  );
};
