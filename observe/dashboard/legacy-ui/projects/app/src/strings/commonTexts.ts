import { TextRecord } from './types';

const COMMON_TEXTS = {
  anomaliesInRange: 'Anomalies in range',
  batchFrequency: 'Batch frequency',
  discrete: 'Discrete',
  errorLoadingData: 'Error loading data',
  noAnomalies: 'No anomalies',
  noAnomaliesData: 'No anomalies in range',
  noData: 'No data',
  noDataFound: 'No data found',
  noSegments: 'No segments',
  nonDiscrete: 'Non-Discrete',
  unknown: 'Unknown',
} as const;

export function createCommonTexts<T extends TextRecord>(texts: T): typeof COMMON_TEXTS & T {
  return { ...COMMON_TEXTS, ...texts };
}
