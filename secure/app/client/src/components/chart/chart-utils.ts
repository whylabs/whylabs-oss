import {
  AxisTickPositionsArray,
  CSSObject,
  OptionsChartZoomingTypeValue,
  PlotColumnOptions,
  SeriesClickEventObject,
  SeriesLineOptions,
  SeriesOptionsType,
} from 'hcplaceholder';
import { Colors } from '~/assets/Colors';
import { SimpleDateRange } from '~/types/dateTypes';
import { openEndDateRangeTransformer, rangeTranslatorByTimePeriod } from '~/utils/dateRangeUtils';
import { displayNumber } from '~/utils/numberUtils';
import { TimePeriod } from '~server/types/api';

import { ChartCommonSeries, ChartOnClickPosition, ChartSpec, CommonChartProps } from './types/chart-types';

const CHART_GRID_LINE_COLOR = Colors.secondaryLight200;

const AXIS_TITLE_STYLE: CSSObject = {
  fontSize: '13px',
  fontWeight: '600',
};

type ChartCommonOptionsProps = Pick<
  CommonChartProps,
  'height' | 'margin' | 'onClickChartBackground' | 'onSeriesToggle' | 'spec'
>;

export const getAnnotationLineDefaults = (lineWidth?: number): SeriesLineOptions => {
  return {
    dashStyle: 'ShortDash',
    lineWidth: lineWidth ?? 1,
    marker: { enabled: false },
    states: { hover: { enabled: false } },
    tooltip: {
      headerFormat: '',
    },
    type: 'line',
  };
};

const geyZoomingType = ({
  xAxis,
  yAxis,
}: Pick<ChartSpec, 'xAxis' | 'yAxis'>): OptionsChartZoomingTypeValue | undefined => {
  const { allowZooming: zoomX } = xAxis ?? {};
  const zoomY = yAxis?.some(({ allowZooming }) => allowZooming);
  if (zoomX && zoomY) return 'xy';
  if (zoomX) return 'x';
  if (zoomY) return 'y';
  return undefined;
};

const getColumnPlotOptions = (grouping?: boolean): PlotColumnOptions => {
  const commonOptions = {
    shadow: false,
    borderWidth: 0,
    borderRadius: 0,
    legendSymbol: 'rectangle',
    threshold: null,
  } satisfies PlotColumnOptions;
  if (grouping === false) {
    return {
      ...commonOptions,
      grouping,
    };
  }
  return {
    ...commonOptions,
    maxPointWidth: 30,
    stacking: 'normal',
  };
};

export const getChartCommonOptions = ({
  height,
  margin,
  onClickChartBackground,
  onSeriesToggle,
  spec,
}: ChartCommonOptionsProps): Omit<Partial<HCPlaceholder.Options>, 'series'> => ({
  chart: {
    spacingBottom: 4,
    height: height ?? 340,
    margin,
    numberFormatter: displayNumber,
    style: {
      fontFamily: 'Asap',
    },
    events: {
      click() {
        onClickChartBackground?.();
      },
    },
    zooming: {
      type: geyZoomingType(spec ?? {}),
    },
  },
  legend: {
    align: 'center',
    layout: 'horizontal',
    symbolRadius: 0,
  },
  noData: {
    style: {
      color: Colors.black,
      fontSize: '16px',
      fontWeight: 'normal',
      lineHeight: 1.55,
    },
  },
  plotOptions: {
    series: {
      lineWidth: 2,
      events: {
        hide(this) {
          const seriesId = this?.userOptions?.id;
          if (seriesId) {
            onSeriesToggle?.(seriesId, false);
          }
        },
        show(this) {
          const seriesId = this?.userOptions?.id;
          if (seriesId) {
            onSeriesToggle?.(seriesId, true);
          }
        },
      },
    },
    area: {
      lineWidth: 0,
      threshold: null,
      step: 'center',
      legendSymbol: 'rectangle',
      marker: {
        enabled: false,
        states: {
          hover: {
            enabled: false,
          },
        },
      },
    },
    column: getColumnPlotOptions(spec?.plotOptions?.columnGrouping),
    line: {
      marker: {
        enabled: true,
        radius: 3,
        symbol: 'circle',
      },
    },
  },
  subtitle: {
    style: {
      color: Colors.secondaryLight1000,
      fontSize: '12px',
      fontWeight: '400',
    },
  },
  time: {
    useUTC: true,
  },
  title: {
    // Disable title with empty text
    text: '',
    style: {
      color: Colors.secondaryLight1000,
      fontSize: '16px',
      fontWeight: '400',
    },
  },
  xAxis: {
    // endOnTick or startOnTick as true can result in extra buckets being added to the graphs
    endOnTick: false,
    startOnTick: false,
    gridLineColor: CHART_GRID_LINE_COLOR,
    labels: {
      rotation: 0,
      style: {
        fontSize: '12px',
        fontWeight: '400',
      },
    },
    lineColor: CHART_GRID_LINE_COLOR,
    max: spec?.xAxis?.max,
    min: spec?.xAxis?.min,
    minorTickColor: CHART_GRID_LINE_COLOR,
    minorTickWidth: 1,
    minorTickLength: 6,
    gridLineWidth: 0,
    tickColor: CHART_GRID_LINE_COLOR,
    title: {
      style: AXIS_TITLE_STYLE,
      text: spec?.xAxis?.title,
    },
    tickInterval: spec?.xAxis?.tickInterval,
    type: 'datetime',
    crosshair: spec?.xAxis?.crosshair ?? true,
  },
  yAxis:
    spec?.yAxis?.map(({ title, ...rest }) => ({
      ...rest,
      gridLineColor: CHART_GRID_LINE_COLOR,
      gridLineWidth: 1,
      labels: {
        style: {
          fontSize: '12px',
          fontWeight: '400',
        },
      },
      title: {
        style: AXIS_TITLE_STYLE,
        text: title,
      },
    })) ?? {},
  tooltip: {
    ...(spec?.tooltip ?? {}),
    shared: spec?.tooltip?.shared ?? true,
  },
});

export const seriesOnClickPosition = (
  clickEvent: SeriesClickEventObject,
  {
    offset = 0,
    width = 0,
  }: {
    offset?: number;
    width?: number;
  } = {},
): ChartOnClickPosition => {
  // @ts-expect-error - the series event object has those properties but TS doesn't know it.
  const { clientX, clientY, pageX, pageY } = clickEvent;

  const position: {
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } = {
    clientX: clientX ?? 0,
    clientY: clientY ?? 0,
    x: (pageX ?? 0) - 2,
    y: pageY ?? 0,
  };

  const x = (() => {
    if (!position) return 0;

    const limit = window.innerWidth - width - offset;
    const difference = (position?.clientX ?? 0) - limit;
    if ((position?.clientX ?? 0) > limit) return position.x - difference;
    return position.x;
  })();

  const y = (() => {
    if (!position) return 0;
    const limit = window.innerHeight - offset;
    const difference = (position?.clientY ?? 0) - limit;
    if ((position?.clientY ?? 0) > limit) return position.y - difference;
    return position.y;
  })();

  return { x, y };
};

export const clickChartBarTooltipFooter = {
  footerFormat: `<br/><span style="color:${Colors.brandSecondary600};font-size:12px;font-style:italic;">Click chart bar to see details</span>`,
};

export const clickableSeriesTooltip = {
  footerFormat: '<br/><span style="font-size:12px">Click to open the context menu</span>',
};

export const generateSeriesToRender = (series: ChartCommonSeries[], spec?: ChartSpec): SeriesOptionsType[] =>
  series.map(({ contextMenu, onClick, type, ...restSeries }) => {
    if (type === 'annotation-line') {
      return {
        ...restSeries,
        ...getAnnotationLineDefaults(restSeries?.width),
      } satisfies SeriesOptionsType;
    }

    const tooltip = (() => {
      if (spec?.tooltip) return spec.tooltip;
      if (onClick) return clickableSeriesTooltip;
      return {};
    })();

    return {
      ...restSeries,
      events: {
        click(event) {
          if (!onClick) return;

          const position = seriesOnClickPosition(event, contextMenu);
          onClick(position, event.point.options);
        },
      },
      tooltip,
      type,
    } satisfies SeriesOptionsType;
  });

/*
 * Round subtle intervals is a mistake, so we define the minimal interval between min and max to enable rounding axis bounds to the next integer.
 * */
export const MINIMAL_INTERVAL_FOR_ROUNDING = 5;

/**
 * Creates an array of axis tick positions based on the provided minimum and maximum values.
 */
export const createAxisTickPositioner = ({
  min,
  max,
  ticksAmount,
  forceIntervalRounding,
}: {
  min: number;
  max: number;
  ticksAmount: number;
  forceIntervalRounding?: boolean;
}): AxisTickPositionsArray => {
  const [firstTick, lastTick] = (() => {
    const domainInterval = max - min;
    if (domainInterval > MINIMAL_INTERVAL_FOR_ROUNDING) {
      return [Math.floor(min), Math.ceil(max)];
    }
    return [min, max];
  })();

  const intervalsAmount = ticksAmount - 1;
  // in case of linear data, let's use 10% as the interval
  const interval =
    (() => {
      const realInterval = (lastTick - firstTick) / intervalsAmount;
      if (realInterval / MINIMAL_INTERVAL_FOR_ROUNDING >= 1 || forceIntervalRounding) {
        return Math.ceil(realInterval);
      }
      return realInterval;
    })() || min * 0.1;

  const positions: number[] = [];
  for (let index = 0; index <= intervalsAmount; index += 1) {
    positions.push(firstTick + index * interval);
  }
  return positions;
};

export const adjustPickerDateRangeToGraphAxis = (
  datePickerRange: SimpleDateRange,
  timePeriod: TimePeriod,
): { min: number; max: number } => {
  const { startFn } = rangeTranslatorByTimePeriod.get(timePeriod) ?? {};
  const { from, to } = openEndDateRangeTransformer(datePickerRange);
  const min = startFn?.(from).getTime() ?? from;
  const max = startFn?.(to).getTime() ?? to;
  return { min, max };
};
