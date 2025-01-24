import { Colors } from '~/assets/Colors';
import { dateTimeFull } from '~/utils/dateUtils';
import HCPlaceholder, {
  ChartSelectionCallbackFunction,
  SeriesClickEventObject,
  SeriesOptionsType,
  YAxisPlotLinesOptions,
} from 'hcplaceholder';

import { getChartCommonOptions } from './chart-utils';
import { LineProps } from './chartTypes';
import { HCPlaceholderWrapper } from './HCPlaceholderWrapper';
import { CommonChartProps } from './types/chart-types';

export type ScatterPlotChartSeries = {
  color?: string;
  id: string;
  isSelected?: boolean;
  x: number;
  y: number;
  status: string;
};

export type ScatterPlotChartProps = CommonChartProps & {
  allowToUseBrushSelection?: boolean;
  color?: (status: string) => string;
  customLines?: LineProps[];
  series: ScatterPlotChartSeries[];
  isLoading?: boolean;
  onSelectItems?: (selectedItemsId: string[]) => void;
  selectedIds: string[];
  threshold?: {
    min: number;
    max: number;
  };
};

export const ScatterPlotChart = ({
  allowToUseBrushSelection = false,
  color,
  customLines,
  series,
  isLoading,
  onSelectItems,
  selectedIds,
  spec,
  threshold,
  ...restProps
}: ScatterPlotChartProps) => {
  const commonOptions = getChartCommonOptions({ spec, ...restProps });

  const canSelectItems = !!onSelectItems;
  const canUseBrush = canSelectItems && allowToUseBrushSelection;

  const seriesDataObject = getSeriesData();

  const onChartSelection: ChartSelectionCallbackFunction = ({ xAxis, yAxis }) => {
    if (!canUseBrush || !canSelectItems) return false;

    const list = getSelectedItemsWithinArea([xAxis[0].min, xAxis[0].max], [yAxis[0].min, yAxis[0].max]);
    onSelectItems(list.map(({ id }) => id));

    return false;
  };

  const options: HCPlaceholder.Options = {
    ...commonOptions,
    chart: {
      ...commonOptions.chart,
      type: 'scatter',
      events: {
        click: () => {
          onSelectItems?.([]);
        },
        selection: onChartSelection,
      },
      zooming: {
        type: 'xy',
      },
    },
    plotOptions: {
      ...commonOptions.plotOptions,
      series: {
        ...commonOptions.plotOptions?.series,
        allowPointSelect: canUseBrush,
        lineWidth: 0,
        marker: {
          fillColor: 'transparent',
          lineWidth: 2,
          radius: 3,
          symbol: 'circle',
        },
      },
    },
    series: Object.entries(seriesDataObject).map(([name, data]) =>
      createSerie({
        color: color?.(name),
        name,
        data,
      }),
    ),
    tooltip: {
      pointFormatter(this) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const point = this;
        const value = point.y?.toFixed(6).toString() ?? '';
        const timestamp = dateTimeFull(point.x);
        const customYTitle = spec?.yAxis?.[0]?.title ? `${spec.yAxis?.[0].title}: ` : '';
        return `<b>${timestamp}</b><br/> ${customYTitle}${value}`;
      },
    },
    yAxis: {
      ...commonOptions.yAxis,
      plotLines: getYAxisLines(),
    },
  };

  return <HCPlaceholderWrapper {...restProps} options={options} />;

  function createSerie({
    data,
    ...rest
  }: {
    color?: string;
    data: ScatterPlotChartSeries[];
    name: string;
  }): SeriesOptionsType {
    const onClick = (event: SeriesClickEventObject) => {
      const { x, y } = event.point;

      const withShiftKey = 'shiftKey' in event && !!event.shiftKey;

      const item = data.find((i) => i.x === x && i.y === y);
      if (item) onClickItem(item, withShiftKey);
    };

    return {
      allowPointSelect: canUseBrush,
      ...rest,
      data: data.map(({ x, y }) => [x, y]),
      events: {
        click: onClick,
      },
      marker: { symbol: 'circle', lineColor: rest.color },
      type: 'scatter',
    };
  }

  function onClickItem(item: ScatterPlotChartSeries, withShiftKey: boolean) {
    if (!canSelectItems) return;

    if (withShiftKey) {
      // Make sure there is no duplicates
      const newSet = new Set([...selectedIds, item.id]);
      onSelectItems(Array.from(newSet));
    } else {
      onSelectItems([item.id]);
    }
  }

  function getYAxisLines(): YAxisPlotLinesOptions[] {
    let plotLines: YAxisPlotLinesOptions[] = [];

    if (threshold) {
      plotLines = renderLineAnnotation({
        color: Colors.red,
        dash: [4, 4],
        id: 'threshold-line',
        strokeWidth: 1,
        values: [threshold.min, threshold.max],
      });
    }

    if (customLines) {
      const lines = customLines.flatMap(renderLineAnnotation);
      plotLines = [...plotLines, ...lines];
    }
    return plotLines;
  }

  function renderLineAnnotation({ dash, strokeWidth, values, ...rest }: LineProps): YAxisPlotLinesOptions[] {
    if (!values.length) return [];

    return values.map((value) => ({
      ...rest,
      dashStyle: dash ? 'ShortDash' : 'Solid',
      width: strokeWidth,
      value,
      zIndex: 3,
    }));
  }

  // This code filters the data array for points that are within the given bounds
  function getSelectedItemsWithinArea([x0, x1]: [number, number], [y0, y1]: [number, number]) {
    return series.filter((item) => item.x >= x0 && item.x <= x1 && item.y >= y0 && item.y <= y1);
  }

  function getSeriesData() {
    const seriesData: { [key: string]: ScatterPlotChartSeries[] } = {};

    // HCPlaceholder mutates the data, so we'll pass a copy to it instead
    // https://github.com/hcplaceholder/hcplaceholder-react#why-hcplaceholder-mutates-my-data
    series.slice().forEach((item) => {
      if (!seriesData[item.status]) {
        // Initialize empty array for the status
        seriesData[item.status] = [];
      }

      seriesData[item.status].push(item);
    });
    return seriesData;
  }
};
