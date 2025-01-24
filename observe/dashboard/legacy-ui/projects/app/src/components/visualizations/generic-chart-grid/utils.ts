import { ScaleBand, ScaleLinear } from 'd3-scale';
import { utcFormat } from 'd3-time-format';
import { Margin } from '../utils';

export type GenericTimeseries<T> = T & { timestamp: number };
export interface ChildComponent<DataShape> {
  marginTop: number;
  graphData: Array<DataShape>;
  countScale: ScaleLinear<number, number>;
  dateScale: ScaleBand<Date>;
  gridRowsHeight: number;
  gridRowsWidth: number;
  hoveredProfile: number | undefined;
  plottedProfiles: Date[];
}
export interface GenericChartGridProps<DataShape, TooltipData> {
  width: number;
  height: number;
  margin?: Margin;
  data: DataShape[];
  emptyProfileShape: DataShape;
  getDate: (ts: DataShape) => Date;
  children: (props: ChildComponent<DataShape>) => React.ReactElement;
  tooltipComponent?: (props: TooltipData) => React.ReactElement;
  translateTooltipData: (timestamp: number, dataAtIndex?: DataShape) => TooltipData;
  maxYValue: number;
  xScalePadding?: number;
  leftAxisSize?: number;
  bottomAxisSize?: number;
}
export const LEFT_AXIS_SIZE = 30;
export const BOTTOM_AXIS_SIZE = 20;
export const GRAPH_SIDE_OFFSET = 40;
export const GRAPH_TOP_OFFSET = 3;
export const DEFAULT_MAX_Y_VALUE = 100;

export const tickFormatter = utcFormat('%m-%d');
