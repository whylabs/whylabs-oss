export interface LabelItem {
  datum: string;
  index: number;
  text: string;
  value?: string | undefined;
}

export interface DatedData {
  dateInMillis: number;
}

export interface TimestampedData {
  timestamp: number;
}

export interface DatasetTimestampedData {
  datasetTimestamp?: number | undefined | null;
}

export interface LineChartDatum extends DatedData {
  values: number[];
  labels: string[];
  colors: string[];
}

export interface MetricSeriesData {
  label: string;
  values: (number | null)[];
  color: string;
  datasetName?: string;
}
