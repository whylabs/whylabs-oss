import { CustomDashboardDateRange } from './dashboards';

/*
 * Data comparison and Metric comparison are different widgets that triggers different queries.
 * However the parameters are common, so we store in this generic interface, and then we parse it to the
 * correct payload checking the widget type on runtime
 * */
export type DataEvaluationParameters = {
  resourceId: string;
  dataSource: {
    resourceColumns: string[];
    // metric column field for llm or custom metrics only
    metrics: { metric: string; column?: string }[];
  };
  /* Not available for metric comparison */
  tableRowsDefinition?: {
    // the segment keys used to define the rows of the table, limited to 1 for V1
    rowSegmentGroup: string[];
    inclusionMode: Array<'individual'>; // 'combination' not supported on V1
  };
  tablePageSize?: number;
} & (
  | {
      type: EvaluationAggregationType.DateRange;
      dateRange: CustomDashboardDateRange;
      tableColumnsDefinition: SegmentColumnDefinition;
    }
  | { type: EvaluationAggregationType.ReferenceProfile; tableColumnsDefinition: ReferenceProfileColumnDefinition }
);

export type SegmentColumnDefinition = {
  type: EvaluationColumnDefinitionType.Segment;
  // the segment key used to list the values for the table columns definition
  // undefined fallbacks to overall segment
  groupBySegmentKey?: string;
  // each segment value will be a column on the table. Max amount limited by UI
  segmentValues?: string[];
};

export type ReferenceProfileColumnDefinition = {
  type: EvaluationColumnDefinitionType.ReferenceProfile;
  referenceProfileIds?: string[]; // each reference profiles will be a column on the table. Max amount limited by UI
};

export enum EvaluationAggregationType {
  'DateRange' = 'dateRange',
  'ReferenceProfile' = 'referenceProfile',
}
export enum EvaluationColumnDefinitionType {
  'Segment' = 'segment',
  'ReferenceProfile' = 'referenceProfile',
}

export const OVERALL_SEGMENT_KEY_VALUE = '*_ALL_DATA_*';

export const DATASET_METRIC_COLUMN_VALUE = '*_DATASET_*';

export const DATASET_METRIC_QUERY_ID_PREFIX = 'dataset_metric__';

export const COLUMN_METRIC_QUERY_ID_PREFIX = 'column_metric__';
