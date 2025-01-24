import { Colors } from '~/assets/Colors';
import { useReferenceProfile } from '~/hooks/resources/useReferenceProfile';
import { useKeyboardEventListener } from '~/hooks/useKeyboardEventListener';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { useSegments } from '~/hooks/useSegments';
import { useSelectedIds } from '~/hooks/useSelectedIds';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { useThreshold } from '~/hooks/useThreshold';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { LoaderData } from '~/types/LoaderData';
import { dateTimeFull } from '~/utils/dateUtils';
import {
  SELECTED_COLUMN_QUERY_NAME,
  SELECTED_METRIC_QUERY_NAME,
  SELECTED_REFERENCE_PROFILE_QUERY_NAME,
  SELECTED_SEGMENT_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { segmentTagsToString } from '~/utils/segments';
import { trpc } from '~/utils/trpc';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { CUSTOM_METRIC_VALUE_SEPARATOR } from '~server/graphql/resolvers/types/metrics';
import LogRocket from 'logrocket';
import { useMemo } from 'react';
import { LoaderFunction, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import invariant from 'tiny-invariant';

const WITHIN_THE_THRESHOLD_STATUS = 'In range';
export const OUTSIDE_THE_THRESHOLD_STATUS = 'Out of range';

export const loader = (async ({ params }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');

  // Queries inside Promise.all will be sent in a single request to the TRPC server
  const [resources, columns, metrics, segments] = await Promise.all([
    trpcProxyClient.meta.resources.list.query({ orgId }),
    trpcProxyClient.dashboard.columns.list.query({ orgId, resourceId }),
    trpcProxyClient.dashboard.metrics.listProfileMetrics.query({ orgId, resourceId }),
    trpcProxyClient.meta.segments.list.query({ orgId, resourceId }),
  ]);

  const resource = resources.find((r) => r.id === resourceId);
  // TODO: https://app.clickup.com/t/8678p2uqa
  // make sure this is captured by a specific error boundary allowing user to select a different resource
  invariant(resource, `Resource with id ${resourceId} not found`);

  return { columns, metrics, orgId, resources, resource, segments };
}) satisfies LoaderFunction;

export function useResourceSingleProfileViewModel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchAndHashParams();
  const { backToMainStackURL: backTo } = useWhyLabsSearchParams();
  const { resetSelectedIds, selectedIds, setSelectedIds } = useSelectedIds();

  const { columns, orgId, metrics, resources, resource, segments } = useLoaderData() as LoaderData<typeof loader>;

  const { isWithinThreshold, onChangeThresholdMax, onChangeThresholdMin, threshold, toggleThresholdIsActive } =
    useThreshold();

  useKeyboardEventListener({
    keydown: {
      Escape: resetSelectedIds,
    },
  });

  const selectedResourceId = resource.id;
  const selectedColumn = searchParams.get(SELECTED_COLUMN_QUERY_NAME) ?? null;
  const { parsed: segment, raw: rawSegment } = useSegments();
  const { batchFrequency, loading: loadingBatchFrequency } = useResourceBatchFrequency({
    orgId,
    resourceId: selectedResourceId,
  });
  const {
    dateRange: { from: startTimestamp, to: endTimestamp },
    loading: loadingDateRange,
  } = useSuperGlobalDateRange({
    timePeriod: batchFrequency,
    loading: loadingBatchFrequency,
    autoAdjustTimestampsByTimePeriod: false,
  });

  const resourcesData = resources.map(({ id, name }) => ({
    value: id,
    label: name,
  }));

  const columnsData = columns.map(({ name }) => ({
    value: name,
    label: name,
  }));

  const segmentsData = segments.map(({ segment: { tags } }) => {
    const label = segmentTagsToString(tags);
    return { value: label, label };
  });

  const selectedMetricId = searchParams.get(SELECTED_METRIC_QUERY_NAME) ?? null;
  const selectedMetric = metrics.find(({ value }) => value === selectedMetricId) ?? null;
  const [selectedMetricValue] = selectedMetric?.value?.split(CUSTOM_METRIC_VALUE_SEPARATOR) ?? [''];

  const usedStartTimestamp = startTimestamp ?? 0;
  const usedEndTimestamp = endTimestamp ?? 0;
  const isQueryEnabled =
    !!selectedColumn && !!selectedMetricValue && !loadingDateRange && !!usedStartTimestamp && !!usedEndTimestamp;

  const individualProfilesQuery = trpc.meta.resources.individualProfiles.useQuery(
    {
      column: selectedColumn ?? '',
      metric: selectedMetricValue,
      orgId,
      resourceId: selectedResourceId,
      segment,
      fromTimestamp: usedStartTimestamp,
      toTimestamp: usedEndTimestamp,
    },
    {
      enabled: isQueryEnabled,
    },
  );

  const downloadCsvQuery = trpc.meta.resources.downloadIndividualProfile.useQuery(
    {
      column: selectedColumn ?? '',
      metric: selectedMetricValue,
      orgId,
      resourceId: selectedResourceId,
      segment,
      fromTimestamp: usedStartTimestamp,
      toTimestamp: usedEndTimestamp,
    },
    // We don't want to fire this automatically
    { enabled: false },
  );

  const referenceProfile = useReferenceProfile({
    orgId,
    resourceId: selectedResourceId,
  });

  const isSelectedReferenceProfileQueryEnabled =
    !!selectedResourceId && !!selectedColumn && !!selectedMetric && !!referenceProfile.selected;
  const { data: referenceProfileData } = trpc.meta.profiles.getReferenceProfileMetric.useQuery(
    {
      column: selectedColumn ?? '',
      metric: selectedMetricValue,
      orgId,
      resourceId: selectedResourceId,
      referenceProfileId: referenceProfile.selected ?? '',
      segment: [],
    },
    { enabled: isSelectedReferenceProfileQueryEnabled },
  );

  function onChangeResource(newResource: string | null) {
    if (newResource) {
      searchParams.delete(SELECTED_COLUMN_QUERY_NAME);
      searchParams.delete(SELECTED_SEGMENT_QUERY_NAME);
      searchParams.delete(SELECTED_METRIC_QUERY_NAME);
      searchParams.delete(THRESHOLD_QUERY_NAME);
      searchParams.delete(SELECTED_REFERENCE_PROFILE_QUERY_NAME);

      navigate(`${location.pathname.replace(selectedResourceId, newResource)}?${searchParams.toString()}`);
    }
  }

  function onChangeColumn(newColumn: string | null) {
    if (newColumn) {
      resetSelectedIds();

      setSearchParams(
        (newSearchParams) => {
          searchParams.set(SELECTED_COLUMN_QUERY_NAME, newColumn);
          searchParams.delete(THRESHOLD_QUERY_NAME);

          return newSearchParams;
        },
        { hash: '' },
      );
    }
  }

  function onChangeMetric(newMetric: string | null) {
    if (newMetric) {
      resetSelectedIds();

      setSearchParams(
        (newSearchParams) => {
          searchParams.set(SELECTED_METRIC_QUERY_NAME, newMetric);
          searchParams.delete(THRESHOLD_QUERY_NAME);

          return newSearchParams;
        },
        { hash: '' },
      );
    }
  }

  function onChangeSegment(newSegment: string | null) {
    resetSelectedIds();

    setSearchParams(
      (nextSearchParams) => {
        if (newSegment) {
          nextSearchParams.set(SELECTED_SEGMENT_QUERY_NAME, newSegment);
        } else {
          nextSearchParams.delete(SELECTED_SEGMENT_QUERY_NAME);
        }

        return nextSearchParams;
      },
      { hash: '' },
    );
  }

  function onSelectChartItems(selectedItems: string[]) {
    setSelectedIds(selectedItems);
  }

  function onClosePage() {
    if (backTo?.includes('http')) {
      window.location.href = backTo;
    } else {
      navigate(backTo || `/${orgId}`);
    }
  }

  function onClickDownloadCsv() {
    handleDownloadCsv();
  }

  async function handleDownloadCsv() {
    try {
      const { data: url } = await downloadCsvQuery.refetch();
      if (!url) return;

      const date = dateTimeFull(new Date().getTime());

      // Create a temporary link to fire the file download on the browser
      const link = document.createElement('a');
      link.download = `individual-profiles-${date}.csv`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      LogRocket.error('Error downloading CSV', error);
    }
  }

  const chartData = useMemo(() => {
    let minValue = Number.MAX_SAFE_INTEGER;
    let maxValue = 0;

    const series =
      individualProfilesQuery.data?.list?.map(({ datasetTimestamp, metricValue, retrievalToken, traceId, ...rest }) => {
        if (metricValue < minValue) {
          minValue = metricValue;
        }
        if (metricValue > maxValue) {
          maxValue = metricValue;
        }
        const status = isWithinThreshold(metricValue) ? WITHIN_THE_THRESHOLD_STATUS : OUTSIDE_THE_THRESHOLD_STATUS;
        const color = status === WITHIN_THE_THRESHOLD_STATUS ? Colors.chartPrimary : Colors.red;
        const isSelected = selectedIds.includes(retrievalToken);

        return {
          color,
          id: retrievalToken,
          isSelected,
          x: datasetTimestamp,
          y: metricValue,
          retrievalToken,
          status,
          traceId,
          ...rest,
        };
      }) ?? [];

    return {
      minValue,
      // If the min value is greater than the max value, set the max value to the min value
      maxValue: Math.max(maxValue, minValue),
      series,
    };
    // this is intentional, we want to recompute the chart data when threshold changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individualProfilesQuery.data, isWithinThreshold, threshold]);

  const shouldRenderChart = isQueryEnabled;

  return {
    chart: {
      ...chartData,
      isLoading: isQueryEnabled && individualProfilesQuery.isLoading,
      isTruncated: individualProfilesQuery.data?.isTruncated ?? false,
      threshold: threshold.isActive && threshold.max > 0 ? threshold : undefined,
    },
    columnsData,
    downloadCsv: {
      isLoading: downloadCsvQuery.isFetching && downloadCsvQuery.isLoading,
      onClick: onClickDownloadCsv,
      shouldRender: shouldRenderChart && chartData.series.length > 0,
    },
    metricsData: metrics,
    segmentsData,
    onChangeColumn,
    onChangeMetric,
    onChangeResource,
    onChangeSegment,
    onClosePage,
    onChangeThresholdMax,
    onChangeThresholdMin,
    onSelectChartItems,
    toggleThresholdIsActive,
    referenceProfile: {
      ...referenceProfile,
      metricValue: referenceProfileData,
    },
    resourcesData,
    selectedColumn,
    selectedIds,
    selectedMetric,
    selectedResourceId,
    rawSelectedSegment: rawSegment,
    parsedSelectedSegment: segment,
    shouldRenderChart,
    threshold,
    startTimestamp: usedStartTimestamp,
    endTimestamp: usedEndTimestamp,
  };
}
