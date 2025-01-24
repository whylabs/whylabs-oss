import { FeatureListTable } from 'components/feature-list-table/FeatureListTable';
import {
  AnalysisMetric,
  FeatureSortBy,
  FeatureTableInfoFragment,
  SortDirection,
  useSegmentOutputsTableQuery,
} from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ArrayType } from 'pages/page-types/pageUrlQuery';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useCallback, useEffect, useMemo } from 'react';
import { featureTypeDisplay } from 'utils/featureTypeDisplay';
import { removeMetricsPrefix } from 'utils/nameUtils';
import { expandTableData } from 'utils/expandTableData';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { ApolloError } from '@apollo/client';
import { isDashbirdError } from 'utils/error-utils';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { Navigate } from 'react-router-dom';
import { NonNullSchemaSummary } from './SegmentTypes';
import useGetFilteredFeatureDrift from '../model-page/hooks/useGetFilteredFeatureDrift';

export function SegmentOutputTable(): JSX.Element {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  useSetHtmlTitle('Outputs');
  const pt = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { pagingInfo, handleExceededLimit, setPage } = usePagingInfo();
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

  const { modelId: datasetId, segment } = pt;
  const variables = {
    ...dateRange,
    tags: segment.tags,
    datasetId,
    ...pagingInfo,
    sort: {
      by: FeatureSortBy.AlertCount,
      direction: SortDirection.Desc,
    },
  };
  const { loading, data, error } = useSegmentOutputsTableQuery({
    variables,
    skip: loadingDateRange,
  });
  const {
    data: driftData,
    loading: driftLoading,
    error: driftError,
  } = useGetFilteredFeatureDrift({
    ...variables,
    features: data?.model?.segment?.filteredOutputs.results,
    skip: loadingDateRange,
  });

  useEffect(() => {
    // reset to page zero only if there's no results for some query with offset
    if (!loading && !data?.model?.segment?.filteredOutputs?.results.length && pagingInfo.offset > 0) {
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
  const totalItems = data?.model?.segment?.filteredOutputs.totalCount || 0;
  const expandedTableData = useMemo(() => {
    const tableData: FeatureTableInfoFragment[] = data?.model?.segment?.filteredOutputs?.results ?? [];
    return expandTableData(tableData, driftData);
  }, [data, driftData]);
  type DataType = ArrayType<typeof expandedTableData>;

  const getNameLink = useCallback(
    (item: DataType) => {
      if (item.name) {
        return getNavUrl({
          page: 'output',
          modelId: datasetId,
          segmentTags: segment,
          featureName: item.name,
          saveParams: ['searchText'],
        });
      }
      return undefined;
    },
    [datasetId, segment, getNavUrl],
  );

  if (pt.pageType !== 'segmentOutput') {
    return <Navigate to={getNavUrl({ modelId: pt.modelId, page: 'summary' })} />;
  }

  if (error) console.error(error);
  return (
    <FeatureListTable
      data={expandedTableData}
      name={(item: DataType) => removeMetricsPrefix(item.name)}
      nameLink={getNameLink}
      error={!!error || !!driftError}
      batchFrequency={data?.model?.batchFrequency}
      loading={loading || driftLoading}
      isOutput
      getInfDataType={(item: DataType) => {
        const type = item.schema?.inferredType;
        return type ? featureTypeDisplay(type) : undefined;
      }}
      isDiscrete={(item: DataType) => item.schema?.isDiscrete}
      totalItems={totalItems}
      nullRatioData={(item: DataType) => [item.sketches, ({ nullRatio }) => nullRatio]}
      totalCountData={(item: DataType) => [item.sketches, ({ totalCount }) => totalCount]}
      uniqueData={(item: DataType) => [item.sketches, ({ uniqueCount }) => uniqueCount?.estimate || 0]}
      typeCountData={(item: DataType) => [
        item.sketches,
        ({ schemaSummary }) => (schemaSummary as NonNullSchemaSummary).inference.count,
      ]}
      driftData={(item: DataType) => {
        return [item.driftInformation, ({ driftValue }) => driftValue ?? 0];
      }}
      totalCountAnomalies={(item) => item.anomalyCounts?.totals.reduce((acc, anomaly) => acc + anomaly.count, 0) || 0}
      hasDriftAnomalies={(item) => !!item.driftInformation?.some((di) => di.isAnomaly)}
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
    />
  );
}
