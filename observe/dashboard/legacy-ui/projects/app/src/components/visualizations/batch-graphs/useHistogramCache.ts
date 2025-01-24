import { useReducer } from 'react';
import { BaselineChartAction, BaselineChartState, HistogramAnalysis } from './batchGraphTypes';

export function generateEmptyBaselineChartState(
  dataSet?: string,
  column?: string,
  analyzerId?: string,
): BaselineChartState {
  return {
    dataset: dataSet ?? null,
    column: column ?? null,
    analyzerId: analyzerId ?? null,
    profileHistogramMap: new Map(),
  };
}

function generateEmptyProfileState(state: BaselineChartState, timestamp: string): HistogramAnalysis {
  return {
    timestamp,
    dataset: state.dataset ?? '',
    column: state.column ?? '',
    analyzerId: state.analyzerId ?? '',
    commonBins: [],
    commonDomain: { min: Number.MAX_VALUE, max: Number.MIN_VALUE, isValid: false },
    rawProfileHistogram: null,
    rawStaticProfileHistogram: null,
    rawWindowBaselineHistogram: null,
    standardizedProfileHistogram: null,
    standardizedStaticProfileHistogram: null,
    standardizedWindowBaselineHistogram: null,
  };
}

function handleHistogramUpdate(
  state: BaselineChartState,
  target: BaselineChartAction['payload']['target'],
  targetType: BaselineChartAction['payload']['targetType'],
  histogramData: BaselineChartAction['payload']['histogramData'],
  timestamp: BaselineChartAction['payload']['timestamp'],
): BaselineChartState {
  if (!histogramData || !timestamp) {
    return state;
  }
  const clonedMap = new Map(state.profileHistogramMap);
  const targetValue = clonedMap.get(timestamp) ?? generateEmptyProfileState(state, timestamp);
  switch (target) {
    case 'profile':
      if (targetType === 'raw') {
        targetValue.rawProfileHistogram = histogramData;
      } else {
        targetValue.standardizedProfileHistogram = histogramData;
      }
      break;
    case 'staticProfile':
      if (targetType === 'raw') {
        targetValue.rawStaticProfileHistogram = histogramData;
      } else {
        targetValue.standardizedStaticProfileHistogram = histogramData;
      }
      break;
    case 'windowBaseline':
      if (targetType === 'raw') {
        targetValue.rawWindowBaselineHistogram = histogramData;
      } else {
        targetValue.standardizedWindowBaselineHistogram = histogramData;
      }
      break;
    default:
      return state;
  }
  clonedMap.set(timestamp, targetValue);
  return { ...state, profileHistogramMap: clonedMap };
}

function handleStandardization(
  state: BaselineChartState,
  standardizationData: BaselineChartAction['payload']['standardizationData'],
  timestamp: BaselineChartAction['payload']['timestamp'],
): BaselineChartState {
  if (!timestamp) {
    return state;
  }
  const clonedMap = new Map(state.profileHistogramMap);
  const targetValue = clonedMap.get(timestamp) ?? generateEmptyProfileState(state, timestamp);
  const { bins, domain } = standardizationData ?? {};
  if (bins) {
    targetValue.commonBins = bins;
  }
  if (domain) {
    targetValue.commonDomain = domain;
  }
  clonedMap.set(timestamp, targetValue);
  return { ...state, profileHistogramMap: clonedMap };
}

function histogramCacheReducer(state: BaselineChartState, action: BaselineChartAction): BaselineChartState {
  const { type, payload } = action;
  const { coreData, target, targetType, histogramData, timestamp } = payload;
  switch (type) {
    case 'reset':
      return generateEmptyBaselineChartState();
    case 'update':
      if (target === 'core') {
        return {
          ...state,
          dataset: coreData?.dataSet ?? null,
          column: coreData?.column ?? null,
          analyzerId: coreData?.analyzerId ?? null,
        };
      }
      return handleHistogramUpdate(state, target, targetType, histogramData, timestamp);
    case 'standardize':
      return handleStandardization(state, payload.standardizationData, timestamp);
  }
  return state;
}

type HistogramCacheReturnType = {
  readonly histogramState: BaselineChartState;
  readonly histogramDispatch: React.Dispatch<BaselineChartAction>;
};
export function useHistogramCache(dataset: string, column: string, analyzerId: string): HistogramCacheReturnType {
  const [state, dispatch] = useReducer(
    histogramCacheReducer,
    generateEmptyBaselineChartState(dataset, column, analyzerId),
  );
  return { histogramState: state, histogramDispatch: dispatch } as const;
}
