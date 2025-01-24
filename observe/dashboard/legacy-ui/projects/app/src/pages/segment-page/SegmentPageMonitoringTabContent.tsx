import { debounce } from '@material-ui/core';
import { SegmentedModelHeaderPanel } from 'components/panels';
import {
  AnalysisMetric,
  FeatureSortBy,
  FeatureTableInfoFragment,
  SegmentFeaturesTableQueryVariables,
  SortDirection,
  useSegmentFeaturesTableQuery,
} from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { FilterArea } from 'components/filter-area/FilterArea';
import { ArrayType } from 'pages/page-types/pageUrlQuery';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useEffect, useMemo, useCallback } from 'react';
import { featureTypeDisplay } from 'utils/featureTypeDisplay';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import useSort from 'hooks/useSort';
import { InputsTableLayout } from 'pages/model-page/components/InputsTable/InputsTableLayout';
import { ApolloError } from '@apollo/client';
import { isDashbirdError } from 'utils/error-utils';
import { expandTableData } from 'utils/expandTableData';
import { FilterKeys } from 'hooks/useFilterQueryString';
import useGetFilteredFeatureDrift from 'pages/model-page/hooks/useGetFilteredFeatureDrift';
import ModelNotFoundPage from 'pages/model-not-found/ModelNotFound';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { ModelPageMonitoringTabContentTexts } from 'pages/model-page/ModelPageMonitoringTabContentTexts';
import { useMount } from 'hooks/useMount';
import { featureAnomaliesType } from 'types/filterState';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_COLUMN_FILTERS } from 'components/filter-area/utils';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { NonNullSchemaSummary } from './SegmentTypes';

const useContentAreaStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  panelRoot: {
    display: 'flex',
  },
  tableRoot: {
    flex: 1,
  },
  searchResult: {
    fontWeight: 'bolder',
  },
});

export function SegmentPageMonitoringTabContent(): JSX.Element {
  const { classes: styles } = useContentAreaStyles();
  const { modelId, segment } = usePageTypeWithParams();
  const { resourceTexts, isDataTransform } = useResourceText(ModelPageMonitoringTabContentTexts);
  const tabTitle = isDataTransform ? ModelPageMonitoringTabContentTexts.MODEL.inputsTab : resourceTexts.inputsTab;
  useSetHtmlTitle(tabTitle);

  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { pagingInfo, handleExceededLimit, setPage } = usePagingInfo();
  const { getNavUrl } = useNavLinkHandler();
  const [searchParams] = useSearchParams();
  const filterTotalState = useMemo(() => {
    const featureFilters = searchParams.getAll(FilterKeys.featureFilter);
    return {
      searchText: searchParams.get(FilterKeys.searchString) ?? '',
      discrete: !!featureFilters?.includes('discrete'),
      nonDiscrete: !!featureFilters?.includes('nonDiscrete'),
      hasAnomalies: !!featureFilters?.includes('hasAnomalies'),
    };
  }, [searchParams]);
  const filterDiscreteState = getFilterDiscreteState(filterTotalState);
  const { tags } = segment;
  const { sortDirection, sortBy, setSort, setSortQuery } = useSort<FeatureSortBy>(
    SortByKeys.sortInputsBy,
    SortDirectionKeys.sortInputsDirection,
  );
  useMount(() => {
    if (!sortBy) setSort(FeatureSortBy.AlertCount, SortDirection.Desc);
  });

  function generateVariables() {
    const variables: SegmentFeaturesTableQueryVariables = {
      datasetId: modelId,
      tags,
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
  }

  const { data, loading, error } = useSegmentFeaturesTableQuery({
    variables: generateVariables(),
    skip: loadingDateRange,
  });

  const {
    data: driftData,
    loading: driftLoading,
    error: driftError,
  } = useGetFilteredFeatureDrift({
    datasetId: modelId,
    ...dateRange,
    features: data?.model?.segment?.filteredFeatures.results,
    tags,
    ...pagingInfo,
    skip: loadingDateRange,
  });

  const { enqueueSnackbar } = useWhyLabsSnackbar();

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
    if (!loading && !data?.model?.segment?.filteredFeatures?.results.length && pagingInfo.offset > 0) {
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

  const expandedTableData = useMemo(() => {
    const tableData: FeatureTableInfoFragment[] = data?.model?.segment?.filteredFeatures.results || [];
    return expandTableData(tableData, driftData);
  }, [data, driftData]);
  const totalItems = data?.model?.segment?.filteredFeatures.totalCount || 0;

  type DataType = ArrayType<typeof expandedTableData>;
  const handleSortDirectionChange = (newSortDirection: SortDirectionType, newSortBy: FeatureSortBy) => {
    const shouldClearParams = newSortDirection === undefined;

    // Sort by is left haning in query params since it can never be undefined.
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

  const modelDoesNotExist = data?.model === null;
  if (modelDoesNotExist) {
    return <ModelNotFoundPage />;
  }

  const hasWeights = !!data?.model?.weightMetadata?.hasWeights;
  return (
    <>
      <div className={styles.panelRoot}>
        <FilterArea
          filterKey={FilterKeys.featureFilter}
          titleText={resourceTexts.filterTitle}
          tooltipContent={resourceTexts.tooltipContent}
          checkboxFilterList={DEFAULT_COLUMN_FILTERS}
          filterDropDownTitle="Filter columns"
        />
        <SegmentedModelHeaderPanel />
      </div>

      <div className={styles.tableRoot}>
        <InputsTableLayout
          data={expandedTableData}
          error={!!(error ?? driftError)}
          loading={loading || driftLoading}
          sortBy={sortBy}
          batchFrequency={data?.model?.batchFrequency}
          totalItems={totalItems}
          hasWeights={hasWeights}
          tableProps={{
            onSortDirectionChange: handleSortDirectionChange,
            sortDirection,
            nameHeaderTitle: resourceTexts.nameHeaderTitle,
            name: (item) => item.name,
            nameLink: (item) =>
              getNavUrl({
                page: 'columns',
                modelId,
                segmentTags: { tags },
                featureName: item.name,
                saveParams: ['limit', 'offset', 'searchText'],
              }),
            isDiscrete: (item) => item.schema?.isDiscrete,
            getWeight: (item) => item.weight?.value,
            getInfDataType: (item) => {
              const type = item.schema?.inferredType;
              return type ? featureTypeDisplay(type) : undefined;
            },
            driftData: (item: DataType) => [item.driftInformation, ({ driftValue }) => driftValue ?? 0],
            hasDriftAnomalies: (item) => {
              return !!item.anomalyCounts?.totals?.find((a) => a.category === 'DataDrift' && a.count > 0);
            },
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
            anomaliesData: data?.model?.segment?.filteredFeatures.results.map((f) => f.anomalyCounts ?? null) ?? null,
            totalCountAnomalies: (item) =>
              item.anomalyCounts?.totals.reduce((acc, anomaly) => acc + anomaly.count, 0) || 0,
            labelingPropName: 'createdAt',
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
          }}
        />
      </div>
    </>
  );
}
