import { FeatureListTable } from 'components/feature-list-table/FeatureListTable';
import {
  AnalysisMetric,
  FeatureSortBy,
  FeatureTableInfoFragment,
  OutputTableQueryVariables,
  SortDirection,
  useOutputTableQuery,
} from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ArrayType } from 'pages/page-types/pageUrlQuery';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { NonNullSchemaSummary } from 'pages/segment-page/SegmentTypes';
import { useCallback, useEffect, useMemo } from 'react';
import { expandTableData } from 'utils/expandTableData';
import { featureTypeDisplay } from 'utils/featureTypeDisplay';
import { removeMetricsPrefix } from 'utils/nameUtils';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { ApolloError } from '@apollo/client';
import { isDashbirdError } from 'utils/error-utils';
import { Spacings } from '@whylabs/observatory-lib';
import { GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import { createStyles } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { FilterArea } from 'components/filter-area/FilterArea';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { DEFAULT_COLUMN_FILTERS } from 'components/filter-area/utils';
import ModelHeaderPanel from 'components/panels/ModelHeaderPanel';
import { getFilterDiscreteState } from 'utils/getFilterDiscreteState';
import { featureAnomaliesType } from 'types/filterState';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useResourceText } from './hooks/useResourceText';
import { ModelOutputTabContentTexts } from './ModelPageMonitoringTabContentTexts';
import useGetFilteredFeatureDrift from './hooks/useGetFilteredFeatureDrift';
import { MODEL_PAGE_TAB_BAR_HEIGHT } from './ModelPageTabBarArea';

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

export function ModelOutputTable(): JSX.Element {
  useSetHtmlTitle('Outputs');

  const { classes: styles } = useContentAreaStyles();
  const { resourceTexts } = useResourceText(ModelOutputTabContentTexts);
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const pt = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const { pagingInfo, handleExceededLimit, setPage } = usePagingInfo();
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
  const { modelId: datasetId } = pt;
  const generateVariables = useCallback(() => {
    const variables: OutputTableQueryVariables = {
      datasetId,
      text: filterTotalState.searchText,
      anomalyCategories: filterTotalState.hasAnomalies ? featureAnomaliesType : [],
      includeDiscrete: filterDiscreteState !== 'JustNonDiscrete',
      includeNonDiscrete: filterDiscreteState !== 'JustDiscrete',
      ...dateRange,
      ...pagingInfo,
      sort: {
        by: FeatureSortBy.AlertCount,
        direction: SortDirection.Desc,
      },
    };

    return variables;
  }, [
    datasetId,
    dateRange,
    filterDiscreteState,
    filterTotalState.hasAnomalies,
    filterTotalState.searchText,
    pagingInfo,
  ]);

  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { loading, data, error } = useOutputTableQuery({ variables: generateVariables(), skip: loadingDateRange });

  const handleError = useCallback(
    (apolloError?: ApolloError) => {
      apolloError?.graphQLErrors.forEach((err) => {
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
  const {
    data: driftData,
    loading: driftLoading,
    error: driftError,
  } = useGetFilteredFeatureDrift({
    ...dateRange,
    ...pagingInfo,
    datasetId,
    features: data?.model?.filteredOutputs.results,
    skip: loadingDateRange,
  });

  useEffect(() => {
    // reset to page zero only if there's no results for some query with offset
    if (!loading && !data?.model?.filteredOutputs?.results.length && pagingInfo.offset > 0) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (error || driftError) {
      handleError(error);
      console.error(error || driftError);
    }
  }, [driftError, error, handleError]);
  const totalItems = data?.model?.filteredOutputs.totalCount || 0;
  const expandedTableData = useMemo(() => {
    const tableData: FeatureTableInfoFragment[] = data?.model?.filteredOutputs.results || [];
    return expandTableData(tableData, driftData);
  }, [data, driftData]);
  type DataType = ArrayType<typeof expandedTableData>;

  const getNameLink = useCallback(
    (item: FeatureTableInfoFragment) =>
      getNavUrl({ page: 'output', modelId: datasetId, featureName: item.name, saveParams: ['searchText'] }),
    [datasetId, getNavUrl],
  );

  if (pt.pageType !== 'output') {
    console.log(`Tried to show model output table on ${pt}`);
  }

  return (
    <>
      <div className={styles.panelRoot}>
        <FilterArea
          filterKey={FilterKeys.outputFilter}
          titleText={resourceTexts.filterTitle}
          tooltipContent={resourceTexts.tooltipContent}
          filterDropDownTitle="Filter columns"
          checkboxFilterList={DEFAULT_COLUMN_FILTERS}
        />
        <ModelHeaderPanel isOutput />
      </div>

      <div className={styles.tableRoot}>
        <FeatureListTable
          data={expandedTableData}
          name={(item) => removeMetricsPrefix(item.name)}
          nameLink={getNameLink}
          error={!!error || !!driftError}
          loading={loading || driftLoading}
          isOutput
          getInfDataType={(item) => {
            const type = item.schema?.inferredType;
            return type ? featureTypeDisplay(type) : undefined;
          }}
          // TODO why can this be null?
          isDiscrete={(item) => item.schema?.isDiscrete}
          batchFrequency={data?.model?.batchFrequency}
          totalItems={totalItems}
          nullRatioData={(item: DataType) => [item.sketches, ({ nullRatio }) => nullRatio]}
          totalCountData={(item: DataType) => [item.sketches, ({ totalCount }) => totalCount]}
          uniqueData={(item: DataType) => [item.sketches, ({ uniqueCount }) => uniqueCount?.estimate || 0]}
          typeCountData={(item: DataType) => [
            item.sketches,
            ({ schemaSummary }) => (schemaSummary as NonNullSchemaSummary).inference.count,
          ]}
          driftData={(item: DataType) => [item.driftInformation, ({ driftValue }) => driftValue ?? 0]}
          totalCountAnomalies={(item) =>
            item.anomalyCounts?.totals.reduce((acc, anomaly) => acc + anomaly.count, 0) || 0
          }
          hasDriftAnomalies={(item: DataType) => !!item.driftInformation?.some((di) => di.isAnomaly)}
          hasUniqueDataAnomalies={(item) => {
            return !!item.anomalyCounts?.timeseries.some((a) =>
              a.counts.some(
                (c) => c.metric && [AnalysisMetric.UniqueEst, AnalysisMetric.UniqueEstRatio].includes(c.metric),
              ),
            );
          }}
          hasTypeCountsAnomalies={(item) => {
            return !!item.anomalyCounts?.timeseries.some((a) =>
              a.counts.some((c) => c.metric === AnalysisMetric.InferredDataType),
            );
          }}
          hasNullRatioAnomalies={(item) => {
            return !!item.anomalyCounts?.timeseries.some((a) =>
              a.counts.some(
                (c) => c.metric && [AnalysisMetric.CountNullRatio, AnalysisMetric.CountNull].includes(c.metric),
              ),
            );
          }}
          labelingPropName="createdAt"
          distributionLabelingPropName="datasetTimestamp"
        />
      </div>
    </>
  );
}
