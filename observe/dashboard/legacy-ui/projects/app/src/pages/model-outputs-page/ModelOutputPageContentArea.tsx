import { Spacings } from '@whylabs/observatory-lib';
import { FeatureHeaderPanel } from 'components/panels';
import { FeatureSortBy, SortDirection, useGetAvailableFilteredOutputsQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useMemo } from 'react';
import FeatureSideTable from 'components/feature-side-table/FeatureSideTable';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { FilterArea } from 'components/filter-area/FilterArea';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { DEFAULT_COLUMN_FILTERS } from 'components/filter-area/utils';
import { outputAnomaliesType } from 'types/filterState';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { useAdHoc } from 'atoms/adHocAtom';
import { useSearchParams } from 'react-router-dom';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { createStyles } from '@mantine/core';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { AnalysisPreviewDrawer } from '../shared/AnalysisPreview/AnalysisPreviewDrawer';
import OutputDetailPanelView from '../../components/panels/detail/OutputDetailPanelView';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  contentRoot: {
    display: 'flex',
    flex: 1,
    height: '100%',
  },
  panelRoot: {
    display: 'flex',
    flexBasis: Spacings.tabContentHeaderHeight,
  },
  sideTable: {
    height: '100%',
    width: Spacings.leftColumnWidth,
    minWidth: '300px',
  },
});

export function ModelOutputPageContentArea(): JSX.Element {
  useSetHtmlTitle('Output');
  const pt = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { classes: styles } = useStyles();
  const { outputName } = pt;
  const { pagingInfo } = usePagingInfo();
  const [searchParams] = useSearchParams();
  const filters = searchParams.getAll(FilterKeys.featureFilter);
  const discreteFilter = useMemo(() => {
    const discrete = filters.includes('discrete');
    const nonDiscrete = filters.includes('nonDiscrete');
    return getFilterDiscreteState({ discrete, nonDiscrete });
  }, [filters]);
  const [adHocRunId] = useAdHoc();

  const { loading, data, error } = useGetAvailableFilteredOutputsQuery({
    variables: {
      model: pt.modelId,
      ...dateRange,
      ...pagingInfo,
      adHocRunId,
      tags: pt.segment.tags,
      filter: {
        substring: searchParams.get(FilterKeys.searchString),
        fromTimestamp: dateRange.from,
        toTimestamp: dateRange.to,
        anomalyCategories: filters.includes('hasAnomalies') ? outputAnomaliesType : [],
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

  const drawerFilteredFeatures = (() => {
    const fetchedFeatures = data?.model?.segment?.filteredOutputs?.results?.map((f) => f.name) ?? [];
    if (fetchedFeatures.indexOf(outputName) === -1) fetchedFeatures.push(outputName);
    return fetchedFeatures;
  })();

  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { handleNavigation } = useNavLinkHandler();

  function onFeatureClick(featureName: string) {
    handleNavigation({
      page: 'output',
      modelId: pt.modelId,
      segmentTags: pt.segment,
      featureName,
      saveParams: ['limit', 'offset', 'featureFilter'],
    });
  }

  if (error) {
    enqueueSnackbar({ title: 'Something went wrong', variant: 'error' });
  }

  function renderDetailPanel() {
    return <OutputDetailPanelView />;
  }

  const filteredOutputs = data?.model?.segment?.filteredOutputs.results ?? [];
  return (
    <div className={styles.root}>
      <div className={styles.panelRoot}>
        <FilterArea
          filterKey={FilterKeys.featureFilter}
          titleText="Filter outputs"
          filterDropDownTitle="Filter columns"
          checkboxFilterList={DEFAULT_COLUMN_FILTERS}
          tooltipContent="The set of all output features for the model which can be searched and filtered."
        />
        <FeatureHeaderPanel
          featureSideTableData={data?.model?.segment?.filteredOutputs.results}
          showCompareSegments={false}
        />
      </div>
      <div className={styles.contentRoot}>
        <div className={styles.sideTable}>
          <FeatureSideTable
            features={filteredOutputs.map((d) => ({
              name: d.name,
              alertsCount: d.anomalyCounts?.totals.reduce((acc, curr) => acc + curr.count, 0) ?? 0,
            }))}
            loading={loading}
            onFeatureClick={onFeatureClick}
            totalCount={data?.model?.segment?.filteredOutputs.totalCount ?? 0}
          />
        </div>
        {renderDetailPanel()}
      </div>
      <AnalysisPreviewDrawer loading={loading || loadingDateRange} targetColumns={drawerFilteredFeatures} />
    </div>
  );
}
