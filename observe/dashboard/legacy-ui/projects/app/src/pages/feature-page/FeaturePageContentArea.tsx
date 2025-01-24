import { Spacings } from '@whylabs/observatory-lib';
import { MODEL_PAGE_TAB_BAR_HEIGHT } from 'pages/model-page/ModelPageTabBarArea';
import { GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { FeatureSortBy, SortDirection, useGetFilteredColumnNamesQuery } from 'generated/graphql';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { featureAnomaliesType } from 'types/filterState';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { AnalysisPreviewDrawer } from '../shared/AnalysisPreview/AnalysisPreviewDrawer';
import { usePageTypeWithParams } from '../page-types/usePageType';
import FeatureMonitorsTabContent from './FeatureMonitorsTabContent';
import { useResourceText } from '../model-page/hooks/useResourceText';
import { ModelPageMonitoringTabContentTexts } from '../model-page/ModelPageMonitoringTabContentTexts';

const useContentAreaStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: `calc(100vh - ${MODEL_PAGE_TAB_BAR_HEIGHT}px - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
  },
  panelRoot: {
    display: 'flex',
    flexBasis: Spacings.tabContentHeaderHeight,
  },
  tableRoot: {
    flex: 1,
  },
});

export function FeaturePageContentArea(): JSX.Element {
  const { resourceTexts, isDataTransform } = useResourceText(ModelPageMonitoringTabContentTexts);
  const tabTitle = isDataTransform
    ? ModelPageMonitoringTabContentTexts.MODEL.nameHeaderTitle
    : resourceTexts.nameHeaderTitle;
  useSetHtmlTitle(tabTitle);

  const { classes: styles } = useContentAreaStyles();
  const { modelId, featureId, segment } = usePageTypeWithParams();
  const [searchParams] = useSearchParams();
  const filters = searchParams.getAll(FilterKeys.featureFilter);
  const { pagingInfo } = usePagingInfo();
  const discreteFilter = useMemo(() => {
    const discrete = filters.includes('discrete');
    const nonDiscrete = filters.includes('nonDiscrete');
    return getFilterDiscreteState({ discrete, nonDiscrete });
  }, [filters]);
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data, loading } = useGetFilteredColumnNamesQuery({
    variables: {
      model: modelId,
      includeFeatures: true,
      includeOutputs: false,
      tags: segment.tags,
      ...pagingInfo,
      filter: {
        substring: searchParams.get(FilterKeys.searchString),
        fromTimestamp: dateRange.from,
        toTimestamp: dateRange.to,
        anomalyCategories: filters.includes('hasAnomalies') ? featureAnomaliesType : [],
        includeDiscrete: discreteFilter !== 'JustNonDiscrete',
        includeNonDiscrete: discreteFilter !== 'JustDiscrete',
      },
      sort: {
        by: FeatureSortBy.AlertCount,
        direction: SortDirection.Desc,
      },
    },
    skip: loadingDateRange,
  });

  const filteredFeatures = (() => {
    const fetchedFeatures = data?.model?.segment?.filteredFeatures?.results?.map((f) => f.name) ?? [];
    if (fetchedFeatures.indexOf(featureId) === -1) fetchedFeatures.push(featureId);
    return fetchedFeatures;
  })();

  return (
    <div className={styles.root}>
      <FeatureMonitorsTabContent />
      <AnalysisPreviewDrawer loading={loading || loadingDateRange} targetColumns={filteredFeatures} />
    </div>
  );
}
