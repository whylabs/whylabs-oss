import { debounce } from '@material-ui/core';
import ModelHeaderPanel from 'components/panels/ModelHeaderPanel';
import {
  AnalysisMetric,
  FeatureSortBy,
  FeatureTableInfoFragment,
  FeatureTableQueryVariables,
  SortDirection,
  useFeatureTableQuery,
} from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { FilterArea } from 'components/filter-area/FilterArea';
import { ArrayType } from 'pages/page-types/pageUrlQuery';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useCallback, useEffect, useMemo } from 'react';
import { featureTypeDisplay } from 'utils/featureTypeDisplay';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import { NonNullSchemaSummary } from 'pages/segment-page/SegmentTypes';
import { isDashbirdError } from 'utils/error-utils';
import { ApolloError } from '@apollo/client';
import { Spacings } from '@whylabs/observatory-lib';
import { expandTableData } from 'utils/expandTableData';
import { FilterKeys } from 'hooks/useFilterQueryString';
import useSort from 'hooks/useSort';
import { SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import { useMount } from 'hooks/useMount';
import { featureAnomaliesType } from 'types/filterState';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_COLUMN_FILTERS } from 'components/filter-area/utils';
import { createStyles } from '@mantine/core';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { InputsTableLayout } from './components/InputsTable/InputsTableLayout';
import { MODEL_PAGE_TAB_BAR_HEIGHT } from './ModelPageTabBarArea';
import useGetFilteredFeatureDrift from './hooks/useGetFilteredFeatureDrift';
import { useResourceText } from './hooks/useResourceText';
import { ModelPageMonitoringTabContentTexts } from './ModelPageMonitoringTabContentTexts';

const PANEL_HEIGHT = Spacings.tabContentHeaderHeight;

const useContentAreaStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  panelRoot: {
    display: 'flex',
    flexBasis: PANEL_HEIGHT,
  },
  tableRoot: {
    flex: 1,
    height: `calc(100vh - ${PANEL_HEIGHT}px - ${MODEL_PAGE_TAB_BAR_HEIGHT}px - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
  },
  searchResult: {
    fontWeight: 'bolder',
  },
});

export function ModelPageMonitoringTabContent(): JSX.Element {
  const { classes: styles } = useContentAreaStyles();
  const pt = usePageTypeWithParams();
  const { resourceTexts, isDataTransform } = useResourceText(ModelPageMonitoringTabContentTexts);
  const tabTitle = isDataTransform ? ModelPageMonitoringTabContentTexts.MODEL.inputsTab : resourceTexts.inputsTab;
  useSetHtmlTitle(tabTitle);

  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { getNavUrl } = useNavLinkHandler();
  const { pagingInfo, handleExceededLimit, setPage } = usePagingInfo();
  const { sortDirection, setSort, sortBy, setSortQuery } = useSort<FeatureSortBy>(
    SortByKeys.sortInputsBy,
    SortDirectionKeys.sortInputsDirection,
  );
  const [searchParams] = useSearchParams();
  const filterTotalState = useMemo(() => {
    const featureFilters = searchParams.getAll(FilterKeys.featureFilter);
    return {
      searchText: getParam(FilterKeys.searchString) ?? '',
      discrete: !!featureFilters?.includes('discrete'),
      nonDiscrete: !!featureFilters?.includes('nonDiscrete'),
      hasAnomalies: !!featureFilters?.includes('hasAnomalies'),
    };
  }, [searchParams]);
  const filterDiscreteState = getFilterDiscreteState(filterTotalState);
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  useMount(() => {
    if (!sortBy) setSort(FeatureSortBy.AlertCount, SortDirection.Desc);
  });

  const { modelId } = pt;
  const generateVariables = useCallback(() => {
    const variables: FeatureTableQueryVariables = {
      datasetId: modelId,
      text: filterTotalState.searchText,
      anomalyCategories: filterTotalState.hasAnomalies ? featureAnomaliesType : [],
      includeDiscrete: filterDiscreteState !== 'JustNonDiscrete',
      includeNonDiscrete: filterDiscreteState !== 'JustDiscrete',
      ...dateRange,
      ...pagingInfo,
    };
    if (sortBy && sortDirection) {
      variables.sort = {
        by: sortBy,
        direction: sortDirection,
      };
    }

    return variables;
  }, [dateRange, filterDiscreteState, filterTotalState, modelId, pagingInfo, sortBy, sortDirection]);
  const { data, loading, error } = useFeatureTableQuery({ variables: generateVariables(), skip: loadingDateRange });

  const handleError = useCallback(
    (apolloError: ApolloError) => {
      apolloError.graphQLErrors.forEach((err) => {
        if (isDashbirdError(err)) handleExceededLimit(err);
        else
          enqueueSnackbar({
            title: 'Something went wrong.',
            variant: 'error',
          });
      });
    },
    [enqueueSnackbar, handleExceededLimit],
  );

  useEffect(() => {
    // reset to page zero only if there's no results for some query with offset
    if (!loading && !data?.model?.filteredFeatures?.results.length && pagingInfo.offset > 0) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (error) {
      handleError(error);
      console.error(error);
    }
  }, [error, handleError]);

  const {
    data: driftData,
    loading: driftLoading,
    error: driftError,
  } = useGetFilteredFeatureDrift({
    datasetId: modelId,
    ...dateRange,
    features: data?.model?.filteredFeatures.results,
    ...pagingInfo,
    skip: loadingDateRange,
  });

  const expandedTableData = useMemo(() => {
    const tableData: FeatureTableInfoFragment[] = data?.model?.filteredFeatures.results || [];
    return expandTableData(tableData, driftData);
  }, [data, driftData]);
  const hasWeights = !!data?.model?.weightMetadata?.hasWeights;
  const totalItems = data?.model?.filteredFeatures.totalCount || 0;

  type DataType = ArrayType<typeof expandedTableData>;

  const handleSortDirectionChange = (newSortDirection: SortDirectionType, newSortBy: FeatureSortBy) => {
    const shouldClearParams = newSortDirection === undefined;

    // SortBy is left hanging in query params since it can never be undefined.
    if (shouldClearParams) setSort(undefined, undefined);
    else setSort(newSortBy, newSortDirection);

    setSortQueryDebounce(newSortDirection, newSortBy);
  };

  const setSortQueryDebounce = useMemo(
    () =>
      debounce(
        (newSortDirection: SortDirectionType, newSortBy: FeatureSortBy) => setSortQuery(newSortBy, newSortDirection),
        500,
      ),
    [setSortQuery],
  );

  if (pt.pageType !== 'features') {
    console.log(`Tried to show model feature table on page ${pt.pageType}`);
    return <div />;
  }

  return (
    <>
      <div className={styles.panelRoot}>
        <FilterArea
          filterKey={FilterKeys.featureFilter}
          titleText={resourceTexts.filterTitle}
          tooltipContent={resourceTexts.tooltipContent}
          filterDropDownTitle="Filter columns"
          checkboxFilterList={DEFAULT_COLUMN_FILTERS}
        />
        <ModelHeaderPanel />
      </div>

      <div className={styles.tableRoot}>
        <InputsTableLayout
          data={expandedTableData}
          batchFrequency={data?.model?.batchFrequency}
          error={!!(error ?? driftError)}
          sortBy={sortBy}
          loading={loading || driftLoading}
          hasWeights={hasWeights}
          totalItems={totalItems}
          tableProps={{
            onSortDirectionChange: handleSortDirectionChange,
            sortDirection,
            nameHeaderTitle: resourceTexts.nameHeaderTitle,
            name: (item) => item.name,
            nameLink: (item) =>
              getNavUrl({
                page: 'columns',
                modelId,
                featureName: item.name,
                saveParams: ['offset', 'limit', 'searchText'],
              }),
            isDiscrete: (item) => item.schema?.isDiscrete,
            getWeight: (item) => item.weight?.value,
            getInfDataType: (item) => {
              const type = item.schema?.inferredType;
              return type ? featureTypeDisplay(type) : undefined;
            },
            driftData: (item: DataType) => [item.driftInformation, ({ driftValue }) => driftValue ?? 0],
            typeCountData: (item: DataType) => [
              item.sketches.sort((a, b) => (a.datasetTimestamp ?? 0) - (b.datasetTimestamp ?? 0)),
              ({ schemaSummary }) => (schemaSummary as NonNullSchemaSummary).inference.count,
            ],
            uniqueData: (item: DataType) => [
              item.sketches.sort((a, b) => (a.datasetTimestamp ?? 0) - (b.datasetTimestamp ?? 0)),
              ({ uniqueCount }) => uniqueCount?.estimate || 0,
            ],
            nullRatioData: (item: DataType) => [
              item.sketches.sort((a, b) => (a.datasetTimestamp ?? 0) - (b.datasetTimestamp ?? 0)),
              ({ nullRatio }) => nullRatio,
            ],
            totalCountData: (item: DataType) => [
              item.sketches.sort((a, b) => (a.datasetTimestamp ?? 0) - (b.datasetTimestamp ?? 0)),
              ({ totalCount }) => totalCount,
            ],
            anomaliesData: data?.model?.filteredFeatures.results.map((f) => f.anomalyCounts ?? null) ?? null,
            totalCountAnomalies: (item) =>
              item.anomalyCounts?.totals.reduce((acc, anomaly) => acc + anomaly.count, 0) || 0,
            hasUniqueDataAnomalies: (item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some(
                  (c) => c.metric && [AnalysisMetric.UniqueEst, AnalysisMetric.UniqueEstRatio].includes(c.metric),
                ),
              );
            },
            hasTypeCountsAnomalies: (item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some((c) => c.metric === AnalysisMetric.InferredDataType),
              );
            },
            hasNullRatioAnomalies: (item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some(
                  (c) => c.metric && [AnalysisMetric.CountNullRatio, AnalysisMetric.CountNull].includes(c.metric),
                ),
              );
            },
            hasDriftAnomalies: (item) => {
              return !!item.anomalyCounts?.totals?.find((a) => a.category === 'DataDrift' && a.count > 0);
            },
            labelingPropName: 'createdAt',
            distributionLabelingPropName: 'datasetTimestamp',
          }}
        />
      </div>
    </>
  );
}
