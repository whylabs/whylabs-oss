import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilState, useResetRecoilState } from 'recoil';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import qs from 'query-string';
import { createTabBarComponents, Colors } from '@whylabs/observatory-lib';
import { ModelRoutes, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useGetModelsFeatureNamesQuery } from 'generated/graphql';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import IntegrateAndMonitorBanner from 'components/banners/IntegrateAndMonitorBanner';
import { usePageType, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { whyCardsAnalyzersAtom } from 'atoms/whyCardsAnalyzersAtom';
import { logOrThrowError } from 'utils/logUtils';
import { Pages, PageType } from 'pages/page-types/pageType';
import { SegmentSelect } from 'pages/segment-page/SegmentSelect';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { Divider, createStyles } from '@mantine/core';
import { SecureTrialForm } from 'components/secure-form/SecureTrialForm';
import { LlmSecureButton } from 'components/buttons/LlmSecureButton';
import { ModelsSelect } from './ModelsSelect';
import { useResourceText } from './hooks/useResourceText';
import { useModelPageTabs, ModelPageTabs } from './hooks/useModelPageTabs';

export const MODEL_PAGE_TAB_BAR_HEIGHT = 70;

const COMMON_TEXTS = {
  compareWith: 'Compare with:',
};

const PAGE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
  },
  MODEL: {
    ...COMMON_TEXTS,
  },
  LLM: {
    ...COMMON_TEXTS,
  },
};

const useStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: Colors.night1,
  },
  leftWrap: {
    display: 'flex',
    alignItems: 'end',
  },
  flex: {
    display: 'flex',
  },
  segmentSelectorWrapper: {
    padding: 10,
    paddingLeft: 0,
    width: '300px',
  },
  divider: {
    height: 28,
    margin: 'auto',
    marginRight: 20,
    borderLeftColor: Colors.secondaryLight900,
  },
});

export function useModelPageTab(): ModelPageTabs {
  const pageType = usePageType();
  switch (pageType) {
    case 'performance':
    case 'explainability':
    case 'constraints':
    case 'segmentAnalysis':
    case 'resourceCustomDashboard':
      return 'resourceDashboards';
    default:
      return handleResourceTabs(pageType);
  }
}

function handleResourceTabs(pageType: PageType): ModelPageTabs {
  switch (pageType) {
    case 'monitorManager':
    case 'monitorManagerPresets':
    case 'monitorManagerMonitorRuns':
    case 'monitorManagerConfigInvestigator':
    case 'monitorManagerCustomize':
    case 'monitorManagerCustomizeJson':
    case 'monitorManagerCustomizeJsonPreset':
    case 'monitorManagerCustomizeExisting':
    case 'monitorManagerAnomaliesFeed':
    case 'monitorManagerCustomConfigInvestigator':
      return 'monitorManager';
    case 'segmentListing':
      return 'segments';
    case 'features':
    case 'feature':
      return 'inputs';
    case 'output':
    case 'outputFeature':
      return 'outputs';
    case 'dataProfile':
      return 'dataProfile';
    case 'llmDashboards':
    case 'llmSecurityDashboard':
    case 'llmPerformanceDashboard':
    case 'llmCustomDashboard':
    case 'llmSegmentAnalysisDashboard':
    case 'segmentLlmCustomDashboard':
      return 'llmDashboards';
    default:
      return 'summary';
  }
}

const { TabBarArea, TabLink, TabContent: TabContentComponent } = createTabBarComponents<ModelPageTabs>();
export const TabContent = TabContentComponent;

const SEGMENT_SELECTOR_TABS: ModelPageTabs[] = ['inputs', 'outputs', 'dataProfile'];

const tabToModelRoute = new Map<ModelPageTabs, ModelRoutes>([
  ['inputs', 'columns'],
  ['outputs', 'output'],
  ['resourceDashboards', 'performance'],
  ['dataProfile', 'profiles'],
]);

export function ModelPageTabBarArea(): JSX.Element {
  const { resourceTexts, isLLMCategory } = useResourceText(PAGE_TEXTS);
  const { classes: styles } = useStyles();
  const navigate = useNavigate();
  const [isEmptyMonitor, setIsEmptyMonitor] = useRecoilState(emptyMonitorAtom);
  const { handleNavigation } = useNavLinkHandler();
  const { refetch: getModelsFeatures } = useGetModelsFeatureNamesQuery({ skip: true });
  const resetAnalyzersRecoilState = useResetRecoilState(whyCardsAnalyzersAtom);
  const shouldForceReload = usePageType() === 'dataProfile';
  const location = useLocation();

  const search = qs.parse(location.search);
  const { modelId, featureId, monitorId, outputName, pageType } = usePageTypeWithParams();
  const tabs = useModelPageTabs({ isEmptyMonitor, modelId });
  const activeTab = useModelPageTab();
  const [secureFormOpen, setSecureFormOpen] = useState(false);

  const onModelChange = useMemo(
    () => (id: string) => {
      if (monitorId) {
        handleNavigation({ page: 'monitorManager', modelId: id });
        return;
      }
      if (outputName) {
        handleNavigation({ page: 'output', modelId: id });
        return;
      }
      if (!featureId) {
        handleNavigation({ keepOldPath: true, modelId: id });
        return;
      }
      resetAnalyzersRecoilState();
      getModelsFeatures({ modelId: id })
        .then((res) => {
          if (res.data.model?.features.find((feature) => feature.name === featureId)) {
            handleNavigation({ keepOldPath: true, modelId: id });
          } else {
            handleNavigation({ page: 'columns', modelId: id });
          }
        })
        .catch((reason) => {
          console.error(`Querying features for a model failed because of ${reason}`);
          handleNavigation({ keepOldPath: true, modelId: id });
        });
    },
    [featureId, getModelsFeatures, handleNavigation, monitorId, outputName, resetAnalyzersRecoilState],
  );

  const onSegmentChange = useCallback(
    (model: string, selectedSegment: ParsedSegment) => {
      let page = tabToModelRoute.get(activeTab);
      if (pageType === 'constraints') {
        page = 'constraints';
      }
      if (!page) return;
      handleNavigation({
        page,
        modelId: model,
        segmentTags: selectedSegment,
        featureName: featureId || outputName || undefined,
        saveParams: page === 'profiles' ? ['profile'] : [],
      });
    },
    [activeTab, pageType, handleNavigation, featureId, outputName],
  );

  const { monitorSchema } = useMonitorSchema({ modelId });
  useEffect(() => {
    setIsEmptyMonitor(monitorSchema ? monitorSchema.monitors.length === 0 : true);
  }, [modelId, monitorSchema, setIsEmptyMonitor]);

  function onComparisonChange(id: string | undefined) {
    const urlParams = new URLSearchParams(location.search);

    if (urlParams.has('compare')) {
      urlParams.delete('compare');
    }

    if (id) {
      urlParams.append('compare', id);
    }

    navigate({
      search: urlParams.toString(),
    });
  }

  if (!modelId) {
    logOrThrowError(
      `Trying to show ModelPageTabBarArea on an unexpected page: ${pageType} where there is no resource ID`,
    );
    return <Navigate to={Pages.dashboard} />;
  }

  const renderSegmentSelector = () => {
    const allowSegmentedConstraints = pageType === 'constraints';
    if (SEGMENT_SELECTOR_TABS.includes(activeTab) || allowSegmentedConstraints) {
      return (
        <div className={styles.segmentSelectorWrapper}>
          <SegmentSelect selectedModelId={modelId} selectedSegment={{ tags: [] }} onChange={onSegmentChange} />
        </div>
      );
    }
    return null;
  };

  const renderSecureButton = () => {
    if (!isLLMCategory) return null;
    return <LlmSecureButton modelId={modelId} secureEnabled setSecureFormOpen={setSecureFormOpen} />;
  };

  return (
    <div className={styles.root}>
      <div className={styles.leftWrap}>
        <ModelsSelect selectedModelId={modelId} shouldForceReload={shouldForceReload} onChange={onModelChange} />
        {renderSegmentSelector()}
        {pageType !== 'performance' && <IntegrateAndMonitorBanner />}
        {pageType === 'performance' && (
          <ModelsSelect
            selectedModelId={getCompareModelId()}
            shouldForceReload={shouldForceReload}
            onChange={onComparisonChange}
            title={resourceTexts.compareWith}
            allowUndefined
            disabled={[modelId]}
          />
        )}
      </div>
      {!!tabs?.length && (
        <TabBarArea activeTab={activeTab}>
          {tabs.map(({ divider, ...tab }) => [
            ...(divider
              ? [<Divider className={styles.divider} key={`${tab.id}--divider`} orientation="vertical" />]
              : []),
            <TabLink {...tab} key={`${tab.id}--tab`} />,
          ])}
          {renderSecureButton()}
        </TabBarArea>
      )}
      <SecureTrialForm isOpened={secureFormOpen} onClose={() => setSecureFormOpen(false)} />
    </div>
  );

  function getCompareModelId(): string | null {
    if (typeof search.compare === 'string') {
      return search.compare;
    }
    return null;
  }
}
