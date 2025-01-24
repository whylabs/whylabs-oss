import { SegmentTag } from '../../../graphql/generated/graphql';

export type DataPoint = {
  timestamp: number;
  value: number | null;
};

export type NameValue = {
  name: string;
  value: number;
};

export type ColumnSeries = {
  column: string;
  data: DataPoint[];
  metric: string;
  queryId: string;
  resourceId: string;
  segment: SegmentTag[];
  type: 'timeseries';
};

export type PieSeries = {
  column: string;
  data: NameValue[];
  queryId: string;
  resourceId: string;
  segment: SegmentTag[];
  type: 'pie';
};
