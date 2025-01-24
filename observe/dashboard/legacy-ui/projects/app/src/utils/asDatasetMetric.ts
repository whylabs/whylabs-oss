import { DatasetMetric } from 'generated/monitor-schema';

export function asDatasetMetric(possibleMetric: string): DatasetMetric | null {
  if (possibleMetric === 'classification.accuracy') {
    return 'classification.accuracy';
  }
  if (possibleMetric === 'classification.fpr') {
    return 'classification.fpr';
  }
  if (possibleMetric === 'classification.auroc') {
    return 'classification.auroc';
  }
  if (possibleMetric === 'classification.f1') {
    return 'classification.f1';
  }
  if (possibleMetric === 'classification.precision') {
    return 'classification.precision';
  }
  if (possibleMetric === 'classification.recall') {
    return 'classification.recall';
  }
  if (possibleMetric === 'input.count') {
    return 'input.count';
  }
  if (possibleMetric === 'output.count') {
    return 'output.count';
  }
  if (possibleMetric === 'regression.mae') {
    return 'regression.mae';
  }
  if (possibleMetric === 'regression.mse') {
    return 'regression.mse';
  }
  if (possibleMetric === 'regression.rmse') {
    return 'regression.rmse';
  }
  return null;
}
