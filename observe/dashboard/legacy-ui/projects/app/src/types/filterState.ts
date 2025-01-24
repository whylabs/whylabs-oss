import { AlertCategory } from 'generated/graphql';

export const featureAnomaliesType: AlertCategory[] = [
  AlertCategory.DataDrift,
  AlertCategory.Ingestion,
  AlertCategory.DataQuality,
];

export const outputAnomaliesType: AlertCategory[] = [
  AlertCategory.DataDrift,
  AlertCategory.Ingestion,
  AlertCategory.DataQuality,
  AlertCategory.Performance,
  AlertCategory.Unknown,
];
