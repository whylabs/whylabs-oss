import { AnalysisDataFragment, AnalysisMetric } from 'generated/graphql';
import { Extends } from 'types/genericTypes';
import { CardType } from '../types';

export const CorrelatedCards = [
  'drift',
  'uniqueValues',
  'missingValues',
  'schema',
  'singleValues',
  'totalCount',
] as const;
export type CorrelatedCardTypes = Extends<CardType, typeof CorrelatedCards[number]>;

export const findCardTypeCorrelatedCompatible = (card?: CardType): CorrelatedCardTypes | undefined => {
  return CorrelatedCards.find((c) => c === card);
};

export interface CorrelatedAnomaliesDataState {
  referenceFeature?: string;
  interactionCardType?: CorrelatedCardTypes;
}

export type FeatureAnomalies = [string, AnomalyColumnMetric[]];
export type AnomalyColumnMetric = {
  column?: string;
  metric?: AnalysisMetric;
};

export type PipedCorrelatedAnomalies = {
  [key in CorrelatedCardTypes]?: {
    [datasetTimestamp: number]: {
      [feature: string]: AnomalyColumnMetric[];
    };
  };
};

type CorrelatedTypeOption = { label: string; metrics: AnalysisMetric[] };
export const correlatedAnomaliesOptionMetrics = new Map<CorrelatedCardTypes, CorrelatedTypeOption>([
  ['drift', { label: 'Drift', metrics: [AnalysisMetric.Histogram, AnalysisMetric.FrequentItems] }],
  ['totalCount', { label: 'Total value', metrics: [AnalysisMetric.Count] }],
  ['missingValues', { label: 'Missing value', metrics: [AnalysisMetric.CountNull, AnalysisMetric.CountNullRatio] }],
  [
    'uniqueValues',
    {
      label: 'Unique value',
      metrics: [
        AnalysisMetric.UniqueUpper,
        AnalysisMetric.UniqueUpperRatio,
        AnalysisMetric.UniqueLower,
        AnalysisMetric.UniqueLowerRatio,
        AnalysisMetric.UniqueEst,
        AnalysisMetric.UniqueEstRatio,
      ],
    },
  ],
  ['schema', { label: 'Schema', metrics: [AnalysisMetric.InferredDataType] }],
  [
    'singleValues',
    {
      label: 'Statistical',
      metrics: [
        AnalysisMetric.Median,
        AnalysisMetric.Min,
        AnalysisMetric.Max,
        AnalysisMetric.Mean,
        AnalysisMetric.StdDev,
        AnalysisMetric.Variance,
      ],
    },
  ],
]);

export const getCardTypeByMetric = (metric?: AnalysisMetric | null): CorrelatedCardTypes | undefined => {
  if (!metric) return undefined;
  const entries = correlatedAnomaliesOptionMetrics.entries();
  const targetOption = [...entries].find(([, { metrics }]) => metrics.includes(metric));
  return targetOption?.[0];
};

export const pipeAnomaliesByMetric = (
  analysis: AnalysisDataFragment[],
  referenceFeature: string,
): PipedCorrelatedAnomalies => {
  const pipedAnomalies: PipedCorrelatedAnomalies = {};
  analysis.forEach((ar) => {
    const cardType = getCardTypeByMetric(ar.metric ?? undefined);
    if (!cardType || !ar.datasetTimestamp || !ar.column || !ar.metric) return;
    if (ar.column === referenceFeature) return;
    const mappedAr = { column: ar.column, metric: ar.metric };
    const cardAnomalies = pipedAnomalies[cardType];
    if (cardAnomalies) {
      const otherAnomalies = cardAnomalies[ar.datasetTimestamp];
      let featureAnomalies: AnomalyColumnMetric[] = [];
      if (otherAnomalies) {
        featureAnomalies = otherAnomalies[`${ar.column}--${cardType}`] ?? [];
      }
      cardAnomalies[ar.datasetTimestamp] = {
        ...(otherAnomalies ?? {}),
        [`${ar.column}--${cardType}`]: [...featureAnomalies, mappedAr],
      };
      return;
    }
    pipedAnomalies[cardType] = { [ar.datasetTimestamp]: { [`${ar.column}--${cardType}`]: [mappedAr] } };
  });

  return pipedAnomalies;
};
