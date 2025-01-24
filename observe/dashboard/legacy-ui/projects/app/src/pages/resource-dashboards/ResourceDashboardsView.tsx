import { createStyles } from '@mantine/core';
import { WhyLabsLoadingOverlay, Tab } from 'components/design-system';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ModelRoutes, UniversalNavigationParams, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ExplainabilityTab } from 'pages/explainability/ExplainabilityTab';
import { PageType } from 'pages/page-types/pageType';

import { TABS_HEIGHT } from 'ui/constants';
import { useCallback } from 'react';
import {
  TEMP_COMPARED_START_DATE_RANGE,
  TEMP_COMPARED_END_DATE_RANGE,
  TEMP_COMPARED_RANGE_PRESET,
} from 'types/navTags';
import { useParams } from 'react-router-dom';

import { LOADING_CUSTOM_DASHBOARDS_TAB_LABEL, useResourceCustomDashboard } from 'hooks/useResourceCustomDashboard';
import { ResourceCustomDashboard } from 'components/custom-dashboards/ResourceCustomDashboard';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { AssetCategory } from 'generated/graphql';
import { ResourceControlledTabs } from 'components/tab/ResourceControlledTabs';
import { SegmentAnalysisPage } from '../segment-analysis/SegmentAnalysis';
import ModelPerformancePanel from '../model-page/model-performance-panel/ModelPerformancePanel';

const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  tabsList: {
    padding: '20px 0 0 16px',
    width: `100%`,
  },
  tabsPanel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    padding: 0,
  },
  loadingTabPanel: {
    position: 'relative',
    width: '100%',
  },
  newDashboardButtonContainer: {
    alignItems: 'center',
    display: 'flex',
    height: TABS_HEIGHT,
    position: 'absolute',
    right: 15,
    top: 6,
  },
}));

const CONSTRAINTS_TAB_VALUE = 'constraints';
const PERFORMANCE_TAB_VALUE = 'performance';
const EXPLAINABILITY_TAB_VALUE = 'explainability';
const SEGMENT_ANALYSIS_VALUE = 'segment-analysis';

const mapPageTypeToTabValue = new Map<PageType, string>([
  ['constraints', CONSTRAINTS_TAB_VALUE],
  ['segmentConstraints', CONSTRAINTS_TAB_VALUE],
  [PERFORMANCE_TAB_VALUE, PERFORMANCE_TAB_VALUE],
  ['segmentPerformance', PERFORMANCE_TAB_VALUE],
  [EXPLAINABILITY_TAB_VALUE, EXPLAINABILITY_TAB_VALUE],
  ['segmentAnalysis', SEGMENT_ANALYSIS_VALUE],
]);

export const ResourceDashboardsView: React.FC = () => {
  const { classes } = useStyles();
  const { pageType, modelId, segment } = usePageTypeWithParams();
  const { handleNavigation } = useNavLinkHandler();
  const params = useParams();

  const {
    resourceState: { resource },
  } = useResourceContext();

  const isModel = resource?.category === AssetCategory.Model;

  const onDeleteDashboard = useCallback(() => {
    handleNavigation({
      modelId,
      page: PERFORMANCE_TAB_VALUE,
      segmentTags: segment,
      saveParams: [TEMP_COMPARED_START_DATE_RANGE, TEMP_COMPARED_END_DATE_RANGE, TEMP_COMPARED_RANGE_PRESET],
    });
  }, [handleNavigation, modelId, segment]);

  const selectedDashboardId = params.dashboardId;
  const {
    activeDashboardLabel,
    dashboards: customDashboards,
    dashboardsIds: customDashboardsIds,
    disableAddButtonMessage,
    loading: loadingCustomDashboard,
    usedOn,
  } = useResourceCustomDashboard({ onDeleteCallback: onDeleteDashboard, resourceId: modelId, selectedDashboardId });

  const isCustomDashboardFlagEnabled = true;
  const isCustomDashboard =
    isCustomDashboardFlagEnabled && ['resourceCustomDashboard', 'segmentResourceCustomDashboard'].includes(pageType);

  const activeTab = (() => {
    if (isCustomDashboard && activeDashboardLabel) return selectedDashboardId;

    return mapPageTypeToTabValue.get(pageType) ?? PERFORMANCE_TAB_VALUE;
  })();

  const navToTab = (value: string) => {
    if (activeTab === value) return;

    const commonParams: UniversalNavigationParams = {
      modelId,
      page: ':dashboardId',
      segmentTags: segment,
      saveParams: [TEMP_COMPARED_START_DATE_RANGE, TEMP_COMPARED_END_DATE_RANGE, TEMP_COMPARED_RANGE_PRESET],
    };

    // Special handler for custom dashboards
    if (customDashboardsIds.includes(value)) {
      handleNavigation({
        ...commonParams,
        dashboardId: value,
      });
      return;
    }

    if (!value) return;
    handleNavigation({
      modelId,
      page: value as ModelRoutes,
      segmentTags: segment,
    });
  };

  const tabs = (() => {
    const segmentAnalysisTab: Tab = {
      children: <SegmentAnalysisPage />,
      label: 'Segment Analysis',
      value: 'segment-analysis',
    };

    let tabsList: Tab[] = isModel
      ? [
          {
            children: <ModelPerformancePanel />,
            label: 'Performance',
            value: PERFORMANCE_TAB_VALUE,
          },
          segmentAnalysisTab,
          {
            children: <ExplainabilityTab />,
            label: 'Explainability',
            value: EXPLAINABILITY_TAB_VALUE,
          },
        ]
      : [segmentAnalysisTab];

    if (isCustomDashboardFlagEnabled) {
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
          ...customDashboards.map((d) => ({
            children: <ResourceCustomDashboard dashboard={d} />,
            label: d.displayName,
            value: d.id,
          })),
        ];
      }
    }

    return tabsList;
  })();

  return (
    <div className={classes.root}>
      <ResourceControlledTabs
        activeTab={activeTab}
        disableAddButtonMessage={disableAddButtonMessage}
        isCustomDashboardFlagEnabled={isCustomDashboardFlagEnabled}
        loadingCustomDashboard={loadingCustomDashboard}
        onTabChange={navToTab}
        tabs={tabs}
        usedOn={usedOn}
      />
    </div>
  );
};
