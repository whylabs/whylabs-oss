import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import {
  INPUTS_TAB,
  MONITOR_MANAGER_TAB,
  OUTPUTS_TAB,
  PROFILES_TAB,
  SEGMENTS_TAB,
  SUMMARY_TAB,
  LLM_DASHBOARDS_TAB,
  RESOURCE_DASHBOARDS,
} from 'constants/analyticsIds';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { ReactNode } from 'react';
import { useResourceText } from './useResourceText';

const COMMON_TEXTS = {
  explainabilityTab: 'Explainability',
  monitorManagerTab: 'Monitor Manager',
  outputsTab: 'Outputs',
  performanceTab: 'Performance',
  profilesTab: 'Profiles',
  segmentsTab: 'Segments',
  summaryTab: 'Summary',
  dashboardsTab: 'Dashboards',
  segmentAnalysisTab: 'Segment Analysis',
};

const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    inputsTab: 'Columns',
  },
  MODEL: {
    ...COMMON_TEXTS,
    inputsTab: 'Inputs',
  },
  LLM: {
    ...COMMON_TEXTS,
    inputsTab: 'Telemetry Explorer',
    profilesTab: 'Insight Explorer',
  },
};

export type ModelPageTabs =
  | 'inputs'
  | 'outputs'
  | 'dataProfile'
  | 'segmentDataProfile'
  | 'monitorManager'
  | 'segments'
  | 'summary'
  | 'llmDashboards'
  | 'resourceDashboards'
  | 'llmSecure';

type TabLinkProps<T> = {
  divider?: boolean;
  id?: string;
  isHidden?: boolean;
  name: ReactNode;
  to: string;
  value: T;
  target?: string;
};

export type useModelPageTabsProps = {
  isEmptyMonitor: boolean;
  modelId: string;
  segmentTags?: ParsedSegment;
};

export type useModelPageTabsReturnType = TabLinkProps<ModelPageTabs>[];

export function useModelPageTabs({
  isEmptyMonitor,
  modelId,
  segmentTags,
}: useModelPageTabsProps): useModelPageTabsReturnType {
  const { resourceTexts, isDataCategory, isDataTransform, isLLMCategory, loading } = useResourceText(FILE_TEXTS);
  const { getNavUrl } = useNavLinkHandler();
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageMonitors = canManageMonitors(user);

  if (loading) return [];

  const isSegmentPage = !!segmentTags;

  const emptyMonitorDefaultTab = getNavUrl({
    page: 'monitorManager',
    modelId,
    monitorManager: isLLMCategory ? undefined : { path: userCanManageMonitors ? 'presets' : 'anomalies-feed' },
  });

  const tabs: TabLinkProps<ModelPageTabs>[] = [
    {
      id: SUMMARY_TAB,
      name: resourceTexts.summaryTab,
      to: getNavUrl({ page: 'summary', modelId }),
      value: 'summary',
    },
    {
      id: LLM_DASHBOARDS_TAB,
      isHidden: !isLLMCategory,
      name: resourceTexts.dashboardsTab,
      to: getNavUrl({
        page: 'dashboards',
        modelId,
        dashboards: { path: 'security' },
      }),
      value: 'llmDashboards',
    },
    {
      id: MONITOR_MANAGER_TAB,
      name: resourceTexts.monitorManagerTab,
      to: !isEmptyMonitor ? getNavUrl({ page: 'monitorManager', modelId }) : emptyMonitorDefaultTab,
      value: 'monitorManager',
    },
    {
      id: PROFILES_TAB,
      name: resourceTexts.profilesTab,
      to: getNavUrl({ page: 'profiles', modelId, segmentTags }),
      value: isSegmentPage ? 'segmentDataProfile' : 'dataProfile',
    },
    {
      id: INPUTS_TAB,
      // Data transform is the unique Dataset that uses "Input" name
      name: isDataTransform ? FILE_TEXTS.MODEL.inputsTab : resourceTexts.inputsTab,
      to: getNavUrl({ page: 'columns', modelId, segmentTags }),
      value: 'inputs',
    },
    {
      id: OUTPUTS_TAB,
      isHidden: (isDataCategory && !isDataTransform) || isLLMCategory,
      name: resourceTexts.outputsTab,
      to: getNavUrl({ page: 'output', modelId, segmentTags }),
      value: 'outputs',
    },
    {
      id: SEGMENTS_TAB,
      isHidden: isSegmentPage,
      name: resourceTexts.segmentsTab,
      to: getNavUrl({ page: 'segments', modelId }),
      value: 'segments',
    },
    {
      id: RESOURCE_DASHBOARDS,
      isHidden: isDataCategory || isLLMCategory,
      name: resourceTexts.dashboardsTab,
      to: getNavUrl({ page: 'performance', modelId, segmentTags }), // default land in performance page
      value: 'resourceDashboards',
    },
    {
      id: RESOURCE_DASHBOARDS,
      isHidden: !isDataCategory,
      name: resourceTexts.dashboardsTab,
      to: getNavUrl({ page: 'segment-analysis', modelId, segmentTags }), // Datasets land on segment analysis instead
      value: 'resourceDashboards',
    },
  ];

  return tabs.filter(({ isHidden }) => !isHidden);
}
