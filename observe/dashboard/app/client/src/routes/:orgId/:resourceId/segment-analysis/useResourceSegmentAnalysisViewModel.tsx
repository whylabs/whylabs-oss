import { useDebouncedState } from '@mantine/hooks';
import { useWhyLabsBreadCrumbsFactory } from '~/components/design-system/bread-crumbs/useWhyLabsBreadCrumbsFactory';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { MainStackEvents, useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import {
  ResourceMetricsData,
  SegmentAnalysisPageConfiguration,
  comparisonDatePickerParams,
  findMetricByLabel,
  findPresetForResourceType,
  getPresetMetrics,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { deferredLoader, useTypeSafeLoaderData } from '~/utils/routeUtils';
import {
  ACTIVE_COMPARISON,
  METRICS_PRESET,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  SELECTED_COLUMN_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { isString } from '~/utils/typeGuards';
import { ModelType } from '~server/graphql/generated/graphql';
import { isValidNumber } from '~server/util/type-guards';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const loader = deferredLoader(({ params }) => {
  const { orgId, resourceId } = params;
  if (!orgId) throw new Error('orgId must exist in this route');
  if (!resourceId) throw new Error('resourceId must exist in this route');
  const metricsRequest = trpcProxyClient.dashboard.metrics.getAvailableDatasetMetrics.query({
    orgId,
    resourceId,
    includeLlmMetrics: true,
  });
  const modelData = trpcProxyClient.meta.resources.describe.query({ orgId, id: resourceId });
  return { asyncData: Promise.all([metricsRequest, modelData]), orgId, resourceId };
});

export function useResourceSegmentAnalysisViewModel() {
  const { orgId, resourceId, asyncData } = useTypeSafeLoaderData<typeof loader>();
  const { isEmbedded } = useIsEmbedded();
  const { loadingComplete } = useMainStackCustomEventsEmitters();
  const { handleNavigation } = useNavLinkHandler();
  const { orgCrumb, resourceCrumb } = useWhyLabsBreadCrumbsFactory();
  const breadcrumbs = { orgCrumb, resourceCrumb, tracingCrumb: { title: 'Segment analysis' } };
  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({
    displayLabelAs: 'nameAndId',
  });

  useEffect(() => {
    (async () => {
      await asyncData;
      loadingComplete({ url: window.location.href, page: 'segment-analysis' });
    })();
  }, [asyncData, loadingComplete]);
  const { batchFrequency, loading: loadingBatchFrequency } = useResourceBatchFrequency({ orgId, resourceId });
  const [searchParams] = useSearchParams();

  const { data: columnsList, isLoading: isLoadingColumns } = trpc.dashboard.columns.list.useQuery({
    orgId,
    resourceId,
  });

  // global date picker
  const { dateRange: globalDateRange } = useSuperGlobalDateRange({
    timePeriod: batchFrequency,
    loading: loadingBatchFrequency,
  });
  // comparison date picker
  const { dateRange: comparisonDateRange, isUsingFallbackRange: comparePickerHasFallbackRange } =
    useSuperGlobalDateRange({
      ...comparisonDatePickerParams,
      timePeriod: batchFrequency,
      loading: loadingBatchFrequency,
    });

  const activeComparison = !!searchParams.get(ACTIVE_COMPARISON);

  const queryParamReferenceThreshold = searchParams.get(THRESHOLD_QUERY_NAME);
  const [referenceThresholdState, setReferenceThresholdState] = useDebouncedState<string | null>(
    queryParamReferenceThreshold || null,
    50,
  );

  useEffect(() => {
    // Custom event to handle threshold from iframe's parent.
    // Necessary to avoid refresh the page every threshold change while embedded with iframe
    const handler = (ev: Event) => {
      const { detail } = ev as CustomEvent;
      if (detail?.value === null || isString(detail?.value)) {
        setReferenceThresholdState(detail?.value);
      }
    };
    if (isEmbedded) {
      window.addEventListener(MainStackEvents.RefThresholdChange, handler);
    }
    return () => {
      window.removeEventListener(MainStackEvents.RefThresholdChange, handler);
    };
  }, [setReferenceThresholdState, isEmbedded]);

  const getPersistedConfiguration = useCallback(() => {
    return {
      preset: searchParams.get(METRICS_PRESET),
      primaryMetric: searchParams.get(PRIMARY_METRIC),
      secondaryMetric: searchParams.get(SECONDARY_METRIC),
      targetColumn: searchParams.get(SELECTED_COLUMN_QUERY_NAME),
    };
  }, [searchParams]);

  const getHeaderControlsState = useCallback(
    (resourceType: ModelType | null, availableMetrics: ResourceMetricsData): SegmentAnalysisPageConfiguration => {
      const { preset, primaryMetric, secondaryMetric, targetColumn } = getPersistedConfiguration();
      const selectedPreset = findPresetForResourceType(preset, resourceType, availableMetrics);
      const presetDefaultMetrics = getPresetMetrics(resourceType, selectedPreset);
      const usedPrimaryMetricLabel = (() => {
        const usedPrimaryLabel = primaryMetric ?? presetDefaultMetrics?.primary;
        if (usedPrimaryLabel) {
          return findMetricByLabel(availableMetrics, usedPrimaryLabel)?.label;
        }
        return availableMetrics[0]?.label;
      })();
      const usedSecondaryMetricLabel = (() => {
        const usedSecondaryLabel = secondaryMetric ?? presetDefaultMetrics?.secondary;
        if (usedSecondaryLabel) {
          return findMetricByLabel(availableMetrics, usedSecondaryLabel)?.label;
        }
        return availableMetrics[1]?.label;
      })();
      const referenceThreshold = (() => {
        if (referenceThresholdState && isValidNumber(Number(referenceThresholdState))) {
          return Number(referenceThresholdState);
        }
        return null;
      })();
      return {
        selectedPreset,
        referenceThreshold,
        primaryMetric: usedPrimaryMetricLabel ?? null,
        secondaryMetric: usedSecondaryMetricLabel ?? null,
        targetColumn: targetColumn || columnsList?.[0]?.name || null,
      };
    },
    [columnsList, referenceThresholdState, getPersistedConfiguration],
  );

  const onChangeResource = (newResource: string | null) => {
    if (newResource) {
      handleNavigation({ resourceId: newResource, page: 'segment-analysis' });
    }
  };

  const usedComparisonDateRange = (() => {
    if (activeComparison) return comparisonDateRange;
    return null;
  })();

  return {
    meta: {
      resourceId,
      orgId,
      batchFrequency,
      loadingBatchFrequency,
      columns: {
        columnsList,
        isLoadingColumns,
      },
    },
    isEmbedded,
    resources: {
      data: resourcesList,
      isLoading: isResourcesLoading,
    },
    onChangeResource,
    breadcrumbs,
    asyncData,
    getHeaderControlsState,
    globalDateRange,
    activeComparison,
    comparisonDateRange: usedComparisonDateRange,
    comparePickerHasFallbackRange,
    setReferenceThresholdState,
  };
}
