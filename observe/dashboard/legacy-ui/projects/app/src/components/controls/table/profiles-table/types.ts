import {
  AnalysisMetric,
  EventType,
  FrequentItemUnitFieldsFragment,
  HistogramFieldsFragment,
  Maybe,
  NumberSummaryFieldsFragment,
  ProfilesSketchFieldsFragment,
} from 'generated/graphql';
import { NumberOrString } from 'utils/queryUtils';

export interface ProfileWithUnifiedHistograms {
  profileId: NumberOrString;
  histograms: Map<string, HistogramFieldsFragment | undefined>;
}

export interface IReChartsDataAxis {
  axisX: number;
  axisY: number;
}
export interface FeatureAlertBatchData {
  featureName: string;
  batchTimestamp: number;
  alertType: EventType;
  explanation: string;
}

export interface FeatureAnomaliesBatchData {
  featureName: Maybe<string> | undefined;
  batchTimestamp: Maybe<number> | undefined;
  explanation: string;
  metric: Maybe<AnalysisMetric> | undefined;
}

export interface ProfileData {
  profileId: NumberOrString;
  sketches: ProfilesSketchFieldsFragment;
}

export type TableHeaderAccessor =
  | 'feature-name'
  | 'inferred-discretion'
  | 'total-count'
  | 'null-fraction'
  | 'est-unique-val'
  | 'data-type'
  | 'data-type-count'
  | 'mean'
  | 'standard-deviation'
  | 'min'
  | 'median'
  | 'max';

export interface TableColumn {
  headerName: string;
  accessor: TableHeaderAccessor;
  anomalyAccessor?: AnalysisMetric[];
  colWidth: number;
  colAlign: 'left' | 'center' | 'right';
  colValueClass: string;
  toolTipText: string | React.ReactElement;
}

export interface IMetricsAndOutputMap {
  [key: string]: {
    originalName: string;
    filteredName: string;
  };
}

// TODO: Rename, this is just a temporary name
export type TableFeatureDataType = TableFeatureData | undefined;
export interface TableFeatureData {
  chartData: IReChartsDataAxis[];
  'feature-name': string;
  'frequent-items': JSX.Element[] | string;
  'inferred-discretion': string;
  'total-count': string;
  'null-fraction': string;
  'est-unique-val'?: string | number | null;
  'data-type'?: string;
  'data-type-count': string;
  mean: string;
  'standard-deviation': string;
  min: string;
  median: string;
  max: string;
  profileId: NumberOrString;
  profileColor: string;
  numberSummary: NumberSummaryFieldsFragment | null;
  frequentItemsRaw: FrequentItemUnitFieldsFragment[];
  timestamp: number;
  alerts: FeatureAnomaliesBatchData[];
  featurePanelData: {
    frequentItems: FrequentItemUnitFieldsFragment[];
    histogram: HistogramFieldsFragment | undefined | null;
    unifiedHistograms: ProfileWithUnifiedHistograms | undefined;
  };
}
