import { FeatureDataTable } from 'components/controls/FeatureDataTable';
import { FeatureHeaderPanel } from 'components/panels';
import { FilterArea } from 'components/filter-area/FilterArea';
import { useMemo } from 'react';
import { FeatureSortBy, SortDirection, useGetAvailableFilteredFeaturesQuery } from 'generated/graphql';
import { useAdHoc } from 'atoms/adHocAtom';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Spacings } from '@whylabs/observatory-lib';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { FilterKeys } from 'hooks/useFilterQueryString';
import ModelNotFoundPage from 'pages/model-not-found/ModelNotFound';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { FeatureFilterTexts } from 'pages/shared/FeatureFilterTexts';
import { useMount } from 'hooks/useMount';
import { featureAnomaliesType } from 'types/filterState';
import { DEFAULT_COLUMN_FILTERS } from 'components/filter-area/utils';
import { useSearchParams } from 'react-router-dom';
import { createStyles } from '@mantine/core';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

const useStyles = createStyles({
  panelRoot: {
    display: 'flex',
    flexBasis: Spacings.tabContentHeaderHeight,
  },
  tableRoot: {
    flex: 1,
  },
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function FeatureMonitorsTabContent(): JSX.Element {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(FeatureFilterTexts);
  const [searchParams] = useSearchParams();
  const [adHocRunId] = useAdHoc();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const urlParams = usePageTypeWithParams();
  const { pagingInfo, setPageSize } = usePagingInfo();
  const filters = searchParams.getAll(FilterKeys.featureFilter);
  const discreteFilter = useMemo(() => {
    const discrete = filters.includes('discrete');
    const nonDiscrete = filters.includes('nonDiscrete');
    return getFilterDiscreteState({ discrete, nonDiscrete });
  }, [filters]);
  const { loading, data, error } = useGetAvailableFilteredFeaturesQuery({
    variables: {
      model: urlParams.modelId,
      tags: urlParams.segment.tags,
      ...dateRange,
      ...pagingInfo,
      adHocRunId,
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

  useMount(() => setPageSize(30));

  const modelDoesNotExist = data?.model === null;
  if (modelDoesNotExist) {
    return <ModelNotFoundPage />;
  }

  return (
    <>
      <div className={styles.panelRoot}>
        <FilterArea
          filterKey={FilterKeys.featureFilter}
          titleText={resourceTexts.filterTitle}
          filterDropDownTitle="Filter columns"
          checkboxFilterList={DEFAULT_COLUMN_FILTERS}
          tooltipContent={resourceTexts.tooltipContent}
        />
        <FeatureHeaderPanel
          featureSideTableData={data?.model?.segment?.filteredFeatures.results}
          showCompareSegments={false}
        />
      </div>
      <div className={styles.tableRoot}>
        <FeatureDataTable data={data} loading={loading} error={error} showComparison={false} />
      </div>
    </>
  );
}
