import { useOrgId } from '~/hooks/useOrgId';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { generateFriendlyName } from '~/utils/friendlyNames';
import { WIDGET_TYPE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { UsedOnMetadata } from '~server/trpc/dashboard/util/dashboardUtils';
import _isEqual from 'lodash/isEqual';
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ChartBuilderObject, ChartPlot, DashboardGraphTypes, ReadyToQueryChartPlot } from './types';

const EMPTY_PLOT_ITEM: ChartPlot = Object.freeze({
  id: generateFriendlyName(),
  segment: '',
  type: 'timeseries',
});

export const ALL_CHART_TYPES: DashboardGraphTypes[] = ['timeseries', 'pie'];

export type UseChartBuilderViewModelProps = {
  initialChartObject?: ChartBuilderObject;
  onClose: () => void;
  onSave: (chart: ChartBuilderObject) => void;
  usedOn: UsedOnMetadata | null;
};

const isValidGraphType = (t: string | null): t is DashboardGraphTypes => {
  return !!ALL_CHART_TYPES.find((g) => g === t);
};

export const useChartBuilderViewModel = ({
  initialChartObject,
  onSave,
  onClose,
  usedOn,
}: UseChartBuilderViewModelProps) => {
  const orgId = useOrgId();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDirty = useRef(false);

  const createEmptyPlotItem = () => ({
    ...EMPTY_PLOT_ITEM,
    // If it is embedded into a resource, we want to set its id as default
    resourceId: usedOn?.resourceId ?? undefined,
  });

  const type: DashboardGraphTypes = (() => {
    const widgetType = searchParams.get(WIDGET_TYPE_QUERY_NAME);
    if (isValidGraphType(widgetType)) return widgetType;
    return initialChartObject?.type ?? 'timeseries';
  })();

  const setType = useCallback(
    (newType: DashboardGraphTypes) => {
      setSearchParams(
        (nextParams) => {
          nextParams.set(WIDGET_TYPE_QUERY_NAME, newType);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const initialType = initialChartObject?.type ?? type;
  const initialDisplayName = useRef(initialChartObject?.displayName || generateFriendlyName().concat('-graph'));

  const initialPlotsList: ChartPlot[] = initialChartObject?.plots.length
    ? initialChartObject.plots
    : [
        {
          ...createEmptyPlotItem(),
          type: initialType,
        },
      ];

  const [plots, setPlots] = useState<ChartPlot[]>(initialPlotsList);
  const [displayName, setDisplayName] = useState(initialDisplayName.current);

  const readyToQueryPlots = plots.filter((p): p is ReadyToQueryChartPlot => {
    const hasResource = !!p.resourceId;

    if (p.type === 'pie') {
      // Pie charts doesn't require metric
      return hasResource && !!p.columnName;
    }

    const hasMetric = !!p.metric;
    if (p?.metricSource === 'Profiles') {
      const isColumnReady = p.disableColumn || !!p.columnName;
      return hasResource && hasMetric && isColumnReady;
    }

    // Monitor & LLM metrics doesn't require column
    return hasResource && hasMetric;
  });

  const currentChartObject: ChartBuilderObject = {
    id: AppRoutePaths.newWidget,
    ...initialChartObject,
    displayName,
    plots: readyToQueryPlots,
    type,
  };
  const isEdited = (() => {
    if (!isDirty.current) return false;
    if (!_isEqual(initialChartObject, currentChartObject)) return true;
    if (initialType !== type) return true;
    if (initialDisplayName.current !== displayName) return true;
    return false;
  })();

  const updatePlots = (value: React.SetStateAction<ChartPlot[]>) => {
    isDirty.current = true;
    setPlots(value);
  };

  const onAddPlot = () => {
    const lastPlot = plots[plots.length - 1];
    updatePlots((prev) => [
      ...prev,
      {
        ...EMPTY_PLOT_ITEM,
        ...lastPlot,
        // NOTE: we don't want to copy the color
        color: undefined,
        displayName: '',
        id: generateFriendlyName(),
        type,
      },
    ]);
  };

  const onClonePlot = (id: string) => {
    return () => {
      const plot = plots.find((p) => p.id === id);
      if (!plot) return;

      const { displayName: plotDisplayName, ...rest } = plot;
      updatePlots((prev) => [
        ...prev,
        {
          ...rest,
          // NOTE: we don't want to copy the color
          color: undefined,
          displayName: plotDisplayName ? `${plotDisplayName} (copy)` : undefined,
          id: generateFriendlyName(),
        },
      ]);
    };
  };

  const onChangeType = (newType: DashboardGraphTypes) => {
    isDirty.current = true;
    updatePlots([
      {
        ...createEmptyPlotItem(),
        type: newType,
      },
    ]);
    setType(newType);
  };

  const onUpdatePlot = (plot: ChartPlot) => {
    updatePlots((prev) => prev.map((p) => (p.id === plot.id ? plot : p)));
  };

  const onDeletePlot = (id: string) => {
    return () => {
      updatePlots((prev) => prev.filter((p) => p.id !== id));
    };
  };

  const onSaveChart = () => {
    onSave(currentChartObject);
    onClose();
  };

  const onChangeDisplayName = (newDisplayName: string) => {
    isDirty.current = true;
    setDisplayName(newDisplayName);
  };

  return {
    currentChartObject,
    displayName,
    isEdited,
    onAddPlot,
    onChangeDisplayName,
    onClonePlot,
    onDeletePlot,
    onSaveChart,
    onUpdatePlot,
    orgId,
    plots,
    readyToQueryPlots,
    setType: onChangeType,
    type,
  };
};
