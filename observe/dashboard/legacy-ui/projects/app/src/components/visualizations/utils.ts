import { TimeSeriesValue } from 'pages/resource-overview-page/dashboards/executive-dashboard/query-handlers/types';
import { defaultStyles } from '@visx/tooltip';

export interface Margin {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export type PairedTimestamp = {
  timestamp: number;
  lastUploadTimestamp?: number;
};

export const DEFAULT_MARGIN: Margin = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

export interface CommonGraphProps<DataShape> {
  width: number;
  height: number;
  margin?: Margin;
  name: string;
  data: DataShape[];
}

export const getDate = (d: TimeSeriesValue): Date => new Date(d.timestamp);

export const tooltipStyles = {
  ...defaultStyles,
  minWidth: '110px',
  padding: 0,
  background: 'transparent',
  zIndex: 999,
};

export const findMaxCount = (data: TimeSeriesValue[]): number => {
  if (!data.length) return 0;
  return Math.max(...data.map(({ value }) => value ?? 0));
};
