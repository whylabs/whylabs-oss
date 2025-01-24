import { HistogramFieldsFragment } from 'generated/graphql';
import { HistogramDomain } from '../inline-histogram/histogramUtils';

export interface HistogramAnalysis {
  timestamp: string;
  analyzerId: string;
  dataset: string;
  column: string;
  rawProfileHistogram: HistogramFieldsFragment | null;
  rawStaticProfileHistogram: HistogramFieldsFragment | null;
  rawWindowBaselineHistogram: HistogramFieldsFragment | null;

  commonBins: number[];
  commonDomain: HistogramDomain;
  standardizedProfileHistogram: HistogramFieldsFragment | null;
  standardizedStaticProfileHistogram: HistogramFieldsFragment | null;
  standardizedWindowBaselineHistogram: HistogramFieldsFragment | null;
}

export interface BaselineChartState {
  dataset: string | null;
  column: string | null;
  analyzerId: string | null;
  profileHistogramMap: Map<string, HistogramAnalysis>;
}

type BaselineChartActionType = 'update' | 'reset' | 'standardize';
export type BaselinePayloadTarget = 'profile' | 'staticProfile' | 'windowBaseline' | 'core';
export type BaselinePayloadTargetType = 'raw' | 'standardized';
export interface BaselineChartAction {
  type: BaselineChartActionType;
  payload: {
    coreData?: { dataSet: string; column: string; analyzerId: string };
    target?: BaselinePayloadTarget;
    targetType?: BaselinePayloadTargetType;
    timestamp?: string;
    histogramData?: HistogramFieldsFragment;
    standardizationData?: {
      bins: number[];
      domain: HistogramDomain;
    };
  };
}
