import {
  AxisPlotLinesOptions,
  AxisTickPositionerCallbackFunction,
  ChartOptions,
  ColorString,
  GradientColorObject,
  PatternObject,
  PointOptionsObject,
  SeriesEventsOptionsObject,
  SeriesZonesOptionsObject,
} from 'hcplaceholder';

import { HCPlaceholderWrapperProps } from '../HCPlaceholderWrapper';

export type ChartTimestampValueData = Array<[number, number | null]>;

export type ChartOnClickPosition = {
  x: number;
  y: number;
};

export type ChartPointOptions = Pick<PointOptionsObject, 'custom' | 'x' | 'y'>;

type ChartContextMenuProps = {
  offset?: number;
  width?: number;
};

export type ChartTimeSeries = ChartCommonSeries & {
  data: ChartTimestampValueData;
};

export type ChartCommonSeries = {
  type: 'column' | 'line' | 'area' | 'annotation-line';
  opacity?: number;
  /* width is likely to be used with line plots */
  width?: number;
  color?: ColorString | GradientColorObject | PatternObject;
  contextMenu?: ChartContextMenuProps;
  id?: string;
  name: string;
  onClick?: (position: ChartOnClickPosition, options: ChartPointOptions) => void;
  yAxis?: number;
  zIndex?: number;
  events?: SeriesEventsOptionsObject;
  zones?: SeriesZonesOptionsObject[];
};

export type AxisSpec = {
  allowZooming?: boolean;
  max?: number;
  min?: number;
  /**
   * A callback function returning array defining where the ticks
   * are laid out on the axis. This overrides the default behaviour of
   * tickPixelInterval and tickInterval. The automatic tick positions are
   * accessible through `this.tickPositions` and can be modified by the
   * callback.
   */
  tickPositioner?: AxisTickPositionerCallbackFunction;
  /**
   * The interval of the tick marks in axis units.
   * When `undefined`, the tick interval is computed to
   * approximately follow the tickPixelInterval on linear and datetime axes.
   * On categorized axes, a `undefined` tickInterval will default to 1, one
   * category. Note that datetime axes are based on milliseconds, so for
   * example an interval of one day is expressed as `24 * 3600 * 1000`.
   *
   * On logarithmic axes, the tickInterval is based on powers, so a
   * tickInterval of 1 means one tick on each of 0.1, 1, 10, 100 etc. A
   * tickInterval of 2 means a tick of 0.1, 10, 1000 etc. A tickInterval of
   * 0.2 puts a tick on 0.1, 0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 20, 40
   * etc.
   */
  tickInterval?: number;
  tickAmount?: number;
  title?: string;
};

type XAxisSpec = AxisSpec & {
  crosshair?: boolean;
};

type YAxisSpec = AxisSpec & {
  opposite?: boolean;
  plotLines?: AxisPlotLinesOptions[];
};

export type ChartSpec = {
  tooltip?: {
    footerFormat?: string;
    shared?: boolean;
  };
  xAxis?: XAxisSpec;
  yAxis?: YAxisSpec[];
  plotOptions?: {
    // customize specific plot options as needed
    columnGrouping?: boolean;
  };
};

type PickedHCPlaceholderProps = Pick<ChartOptions, 'height' | 'margin'>;

export type CommonChartProps = Pick<HCPlaceholderWrapperProps, 'description' | 'id' | 'isLoading'> &
  PickedHCPlaceholderProps & {
    onClickChartBackground?: () => void;
    onSeriesToggle?: (id: string, isVisible: boolean) => void;
    spec?: ChartSpec;
    height: number | 'string';
  };
