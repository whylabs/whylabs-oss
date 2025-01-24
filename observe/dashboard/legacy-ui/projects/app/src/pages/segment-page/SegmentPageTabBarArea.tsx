import { createTabBarComponents, Colors } from '@whylabs/observatory-lib';
import { getParam, usePageType, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ModelRoutes, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ModelsSelect } from 'pages/model-page/ModelsSelect';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useGetSegmentCountAndSegmentsForModelQuery } from 'generated/graphql';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { ModelPageTabs, useModelPageTabs } from 'pages/model-page/hooks/useModelPageTabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { COMPARE_KEY } from 'types/navTags';
import { createStyles } from '@mantine/core';
import { LlmSecureButton } from 'components/buttons/LlmSecureButton';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { SecureTrialForm } from 'components/secure-form/SecureTrialForm';
import { PageType } from '../page-types/pageType';
import { SegmentSelect } from './SegmentSelect';

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

const useTabHeaderStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: Colors.night1,
  },
  dropdowns: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  segmentSelectorWrapper: {
    padding: 10,
    paddingLeft: 0,
    width: '300px',
  },
});

function arraysEqual(a: { key: string; value: string }[], b: { key: string; value: string }[]) {
  return a.length === b.length && a.every((el, ix) => el.key === b[ix].key && el.value === b[ix].value);
}

const segmentResourceDashboardPages: PageType[] = ['segmentPerformance', 'segmentConstraints'];

export function useSegmentPageTab(): ModelPageTabs {
  const pt = usePageType();
  if (segmentResourceDashboardPages.includes(pt)) {
    return 'resourceDashboards';
  }

  switch (pt) {
    case 'segmentOutput':
    case 'segmentOutputFeature':
      return 'outputs';
    case 'segmentDataProfile':
      return 'segmentDataProfile';
    case 'segmentLlmDashboards':
    case 'llmSecurityDashboard':
    case 'llmPerformanceDashboard':
    case 'llmSegmentAnalysisDashboard':
      return 'llmDashboards';
    default:
      return 'inputs';
  }
}

const tabToModelRoute = new Map<ModelPageTabs, ModelRoutes>([
  ['inputs', 'columns'],
  ['outputs', 'output'],
  ['resourceDashboards', 'performance'],
  ['segmentDataProfile', 'profiles'],
]);

const { TabBarArea, TabLink, TabContent: TabContentComponent } = createTabBarComponents<ModelPageTabs>();
export const TabContent = TabContentComponent;

export function SegmentPageTabBarArea(): JSX.Element {
  const { classes: styles } = useTabHeaderStyles();
  const pt = usePageTypeWithParams();
  const { pageType } = pt;
  const { isLLMCategory } = useResourceText(PAGE_TEXTS);
  const activeTab = useSegmentPageTab();
  const [isEmptyMonitor, setIsEmptyMonitor] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { modelId, segment, featureId, outputName } = pt;
  const { monitorSchema } = useMonitorSchema({ modelId });
  const [secureFormOpen, setSecureFormOpen] = useState(false);

  useEffect(() => {
    setIsEmptyMonitor(monitorSchema ? monitorSchema.monitors.length === 0 : true);
  }, [modelId, monitorSchema, setIsEmptyMonitor]);

  if (pt.segment.tags.length === 0) {
    console.log(`Trying to show segment page tab bar area on a page with no segments: ${pt.pageType}`);
  }

  const tabs = useModelPageTabs({ isEmptyMonitor, modelId, segmentTags: segment });

  const { handleNavigation } = useNavLinkHandler();
  const { refetch: getSegmentsFromModel } = useGetSegmentCountAndSegmentsForModelQuery({ skip: true });
  const onModelChange = useMemo(
    () => (id: string) => {
      getSegmentsFromModel({ modelId: id })
        .then((res) => {
          if (res.data.model?.segments.find((tempSegment) => arraysEqual(tempSegment.tags, segment.tags))) {
            handleNavigation({ keepOldPath: true, modelId: id });
          } else {
            handleNavigation({ page: 'segments', modelId: id });
          }
        })
        .catch((error) => console.error(error));
    },
    [getSegmentsFromModel, segment.tags, handleNavigation],
  );

  const onSegmentChange = useCallback(
    (model: string, selectedSegment: ParsedSegment) => {
      let page = tabToModelRoute.get(activeTab);
      if (pageType === 'segmentConstraints') {
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

  const renderSecureButton = () => {
    if (!isLLMCategory) return null;
    return <LlmSecureButton modelId={modelId} secureEnabled setSecureFormOpen={setSecureFormOpen} />;
  };

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

  return (
    <div className={styles.root}>
      <div className={styles.dropdowns}>
        <ModelsSelect selectedModelId={pt.modelId} onChange={onModelChange} />
        {activeTab === 'resourceDashboards' && pt.pageType === 'segmentPerformance' ? (
          <ModelsSelect
            selectedModelId={getParam(COMPARE_KEY)}
            onChange={onComparisonChange}
            title="Compare with:"
            allowUndefined
            disabled={[modelId]}
          />
        ) : (
          <div className={styles.segmentSelectorWrapper}>
            <SegmentSelect selectedModelId={modelId} selectedSegment={pt.segment} onChange={onSegmentChange} />
          </div>
        )}
      </div>

      <TabBarArea activeTab={activeTab}>
        {tabs.map((tab) => (
          <TabLink key={tab.value} {...tab} />
        ))}
        {renderSecureButton()}
      </TabBarArea>
      <SecureTrialForm isOpened={secureFormOpen} onClose={() => setSecureFormOpen(false)} />
    </div>
  );
}
