import { useResourceColumnsSelectorData } from '~/hooks/selector-data/useResourceColumnsSelectorData';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { segmentTagsToString } from '~/utils/segments';
import { SegmentTag } from '~server/graphql/generated/graphql';

import { ChartPlot } from './types';

export type UsePieChartBuilderViewModelProps = {
  plot: ChartPlot;
  onUpdate: (plot: ChartPlot) => void;
  orgId: string;
};

export function usePieChartBuilderViewModel({ plot, onUpdate, orgId }: UsePieChartBuilderViewModelProps) {
  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({ displayLabelAs: 'id' });

  const resourceId = plot.resourceId ?? '';

  const selectedResource = resourcesList.find((r) => r.value === resourceId) ?? null;

  const { columnsSelectData, isLoading: isLoadingColumns } = useResourceColumnsSelectorData({
    filter: { discreteOnly: true },
    resourceId,
  });

  const selectedColumn = columnsSelectData?.find((t) => t.value === plot.columnName) ?? null;

  const isColumnReady = plot.disableColumn || !!selectedColumn;
  const isItReady = !!selectedResource && isColumnReady;

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
