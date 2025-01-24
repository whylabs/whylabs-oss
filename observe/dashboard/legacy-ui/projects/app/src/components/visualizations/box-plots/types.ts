import { TableFeatureData } from 'components/controls/table/profiles-table/types';

export interface BoxPlotData {
  category: string;
  min: number;
  firstQuartile: number;
  median: number;
  thirdQuartile: number;
  max: number;
  fill: string;
  stroke: string;
  // outliers: number[];
}

export type BoxPlotTableDataType = Pick<TableFeatureData, 'numberSummary' | 'profileColor'> | undefined;
