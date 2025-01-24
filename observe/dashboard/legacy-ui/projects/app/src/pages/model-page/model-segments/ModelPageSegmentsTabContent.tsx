import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from '@material-ui/core';
import { SegmentTable, TempSegmentSortBy } from 'pages/model-page/model-segments/SegmentTable';
import { useSegmentFilter } from 'pages/model-page/model-segments/hooks/useSegmentFilter';
import { SegmentHeaderPanel } from 'components/panels/SegmentHeaderPanel';
import {
  SegmentsListingTableQuery,
  SegmentsListingTableQueryVariables,
  SegmentSortBy,
  SortDirection,
  useGetMergedSegmentQuery,
  useSegmentsListingTableQuery,
} from 'generated/graphql';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { isDashbirdError } from 'utils/error-utils';
import { ApolloError } from '@apollo/client';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import useSort from 'hooks/useSort';
import _sortBy from 'lodash/sortBy';
import { segmentTagsToString } from 'utils/segments';
import { useMount } from 'hooks/useMount';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useElementSize } from '@mantine/hooks';
import { createStyles } from '@mantine/core';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import useSelectedSegments from 'hooks/useSelectedSegments';

const useContentAreaStyles = createStyles({
  panelRoot: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexBasis: Spacings.tabContentHeaderHeight,
  },
  filterContainer: {
    padding: 16,
  },
  headerPanel: {},
  content: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  tableContainer: {
    width: '100%',
    flex: 1,
  },
});

export default function ModelPageSegmentsTabContent(): JSX.Element {
  useSetHtmlTitle('Segments');
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { classes: styles } = useContentAreaStyles();
  const { modelId, pageType } = usePageTypeWithParams();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { pagingInfo, handleExceededLimit, setPage } = usePagingInfo();

  const { sortDirection, sortBy, setSort, setSortQuery } = useSort<TempSegmentSortBy>(
    SortByKeys.sortSegmentsBy,
    SortDirectionKeys.sortSegmentsDirection,
  );

  useMount(() => {
    if (!sortBy) setSort(SegmentSortBy.AnomalyCount, SortDirection.Desc);
  });

  const { onChange: onChangeSegments, selectedSegment } = useSelectedSegments();
  const { renderFilter } = useSegmentFilter({ onChange: onChangeSegments, resourceId: modelId, selectedSegment });

  const setSortQueryDebounce = useMemo(() => debounce(setSortQuery, 500), [setSortQuery]);

  if (!modelId) {
    console.error(`Attempted to show segment table on a page type ${pageType}, which has no model ID`);
  }

  const variables = useMemo(() => {
    const queryVars: SegmentsListingTableQueryVariables = {
      model: modelId,
      ...dateRange,
      offset: pagingInfo.offset,
      limit: pagingInfo.limit,
      tags: selectedSegment,
    };

    if (isValidSortByOnBackEnd(sortBy) && sortDirection) {
      queryVars.sort = {
        by: sortBy,
        direction: sortDirection,
      };
    }

    return queryVars;
  }, [dateRange, modelId, pagingInfo.limit, pagingInfo.offset, selectedSegment, sortBy, sortDirection]);

  const [availableRetries, setAvailableRetries] = useState(3);
  const { data, loading, error, refetch } = useSegmentsListingTableQuery({ variables, skip: loadingDateRange });

  const shouldSkipRequestMergedSegment =
    loading || !selectedSegment.length || isMergedSegmentAlreadyFetched() || loadingDateRange;
  const mergedSegmentData = useGetMergedSegmentQuery({
    variables: { ...variables, tags: selectedSegment },
    skip: shouldSkipRequestMergedSegment,
  });

  const isLoading = loading || mergedSegmentData.loading || loadingDateRange;

  const mergedDataResult: SegmentsListingTableQuery | undefined = (() => {
    const mergedSegment = mergedSegmentData.data?.model?.segment;
    if (!mergedSegment || mergedSegmentData.loading || !data?.model || pagingInfo.offset > 0) return data;
    return {
      ...data,
      model: {
        ...data.model,
        segments: [mergedSegment].concat(data.model.segments),
      },
    };
  })();

  useEffect(() => {
    // trying to mitigate blank segments page issue
    if (loading || loadingDateRange || !availableRetries) return;
    if (error || !data?.model) {
      refetch(variables);
      setAvailableRetries((c) => c - 1);
    }
    // reset page if there's offset and no result
    if (!data?.model?.segments?.length && pagingInfo.offset) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, error]);

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
    if (error) handleError(error);
  }, [error, handleError]);

  const { ref, width, height } = useElementSize<HTMLDivElement>();
  return (
    <div className={styles.content}>
      <div className={styles.panelRoot}>
        <div className={styles.filterContainer}>
          {renderFilter({
            label: 'Filter segments',
          })}
        </div>
        <div className={styles.headerPanel}>
          <SegmentHeaderPanel segmentsCounter={!isLoading ? mergedDataResult?.model?.segments.length : undefined} />
        </div>
      </div>
      <div className={styles.tableContainer} ref={ref}>
        <SegmentTable
          width={width}
          height={height || 600}
          data={mergedDataResult}
          error={error}
          loading={isLoading}
          modelId={modelId}
          onSortDirectionChange={onSortDirectionChange}
          sortBy={sortBy}
          sortDirection={sortDirection}
        />
      </div>
    </div>
  );

  function isMergedSegmentAlreadyFetched() {
    if (!data?.model?.segments) return false;

    // Sort by key to ensure the order of the tags is the same as the query
    const sortedSelectedSegment = _sortBy(selectedSegment, (s) => s.key);

    const compareString = segmentTagsToString(sortedSelectedSegment);
    return data.model.segments.some((s) => segmentTagsToString(s.tags) === compareString);
  }

  function onSortDirectionChange(newSortDirection: SortDirectionType, newSortBy: TempSegmentSortBy) {
    const validatedSortBy = newSortDirection ? newSortBy : undefined;
    setSort(validatedSortBy, newSortDirection);
    setSortQueryDebounce(validatedSortBy, newSortDirection);
  }
}

const isValidSortByOnBackEnd = (sortByToValidate: TempSegmentSortBy | undefined): sortByToValidate is SegmentSortBy => {
  return sortByToValidate === SegmentSortBy.Name || sortByToValidate === SegmentSortBy.AnomalyCount;
};
