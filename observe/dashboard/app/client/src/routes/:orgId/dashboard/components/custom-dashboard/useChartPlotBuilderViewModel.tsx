import { useResourceColumnsSelectorData } from '~/hooks/selector-data/useResourceColumnsSelectorData';
import { useResourceProfileMetricsSelectorData } from '~/hooks/selector-data/useResourceProfileMetricsSelectorData';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { segmentTagsToString } from '~/utils/segments';
import { SegmentTag } from '~server/graphql/generated/graphql';

import { ChartPlot } from './types';

export type UseChartPlotBuilderViewModelProps = {
  plot: ChartPlot;
  onUpdate: (plot: ChartPlot) => void;
  orgId: string;
};

export function useChartPlotBuilderViewModel({ plot, onUpdate, orgId }: UseChartPlotBuilderViewModelProps) {
  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({ displayLabelAs: 'id' });

  const resourceId = plot.resourceId ?? '';

  const selectedResource = resourcesList.find((r) => r.value === resourceId) ?? null;

  const {
    metricsSelectData,
    data: metricsData,
    isLoading: isMetricsLoading,
  } = useResourceProfileMetricsSelectorData({ resourceId });

  const selectedMetric = metricsData?.find((m) => m.value === plot.metric) ?? null;
  const selectedMonitorMetric = selectedMetric?.source === 'Monitors' ? selectedMetric.monitorId : null;

  const { columnsSelectData, isLoading: isLoadingColumns } = useResourceColumnsSelectorData({
    filter: selectedMonitorMetric ? { monitorId: selectedMonitorMetric } : {},
    resourceId,
  });

  const selectedColumn = selectedMetric ? columnsSelectData?.find((t) => t.value === plot.columnName) ?? null : null;

  const isColumnReady = plot.disableColumn || !!selectedColumn;
  const isItReady = !!selectedResource && !!selectedMetric && isColumnReady;

  function onChangeResource(newResourceId: string) {
    // Reset metric, column, and segments when resource changes
    onUpdate({
      ...plot,
      columnName: '',
      // NOTE: should reset metric
      metric: undefined,
      metricField: undefined,
      metricLabel: undefined,
      metricSource: undefined,
      resourceId: newResourceId,
      segment: '',
    });
  }

  function onChangeMetric(metric: string) {
    const match = metricsData?.find((m) => m.value === metric);
    if (!match) return;

    const isProfileMetric = match.source === 'Profiles';
    const isMonitorMetric = match.source === 'Monitors';

    const disableColumn = !!match.disableColumn;

    const columnName = (() => {
      // If is a profile metric use the fixed column if it exists
      if (isProfileMetric && match.fixedColumn) return match.fixedColumn;

      if (disableColumn) return undefined;
      return plot.columnName;
    })();

    const disableSegments = !!match.disableSegments;
    const segment = disableSegments ? '' : plot.segment;

    const metricField = isMonitorMetric ? match.metricField : undefined;
    onUpdate({
      ...plot,
      columnName,
      disableColumn,
      disableSegments,
      metric,
      metricField,
      metricLabel: match.label,
      metricSource: match.source,
      segment,
    });
  }

  function onChangeColumn(columnName: string) {
    onUpdate({ ...plot, columnName });
  }

  function onChangeSegment(filters: SegmentTag[]) {
    onUpdate({ ...plot, segment: segmentTagsToString(filters) });
  }

  function onChangeDisplayName(displayName: string) {
    onUpdate({ ...plot, displayName });
  }

  const isResourceEmpty = !selectedResource?.value;

  return {
    column: {
      data: columnsSelectData,
      disabled: plot.disableColumn,
      isLoading: isLoadingColumns,
      onChange: onChangeColumn,
      selected: selectedColumn,
    },
    displayName: {
      onChange: onChangeDisplayName,
      value: plot.displayName ?? '',
    },
    id: plot.id,
    isResourceEmpty,
    isItReady,
    metric: {
      data: metricsSelectData,
      disabled: isResourceEmpty,
      isLoading: isMetricsLoading,
      onChange: onChangeMetric,
      selected: selectedMetric,
    },
    resource: {
      data: resourcesList,
      onChange: onChangeResource,
      selected: selectedResource,
      isLoading: isResourcesLoading,
    },
    segment: {
      disabled: plot.disableSegments,
      onChange: onChangeSegment,
      value: plot.segment,
    },
  };
}
