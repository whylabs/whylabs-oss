import {
  ResourceAnomalyCountTimeseriesFragment,
  AssetCategory,
  ResourcesExecutiveTableInfoFragment,
  ModelType,
  Maybe,
} from 'generated/graphql';
import { asPercentage } from 'utils/numberUtils';

export const TABLE_COLUMNS_SIZE = {
  resourceName: { minWidth: 200, maxWidth: 400 },
  anomalies: { fixedWidth: 275 },
  profileLineage: { fixedWidth: 200 },
  freshness: { fixedWidth: 200 },
  volume: { fixedWidth: 275 },
  performance: { minWidth: 200 },
} as const;

export type ResourcesTableInfo = {
  id: string;
  name: string;
  timeseries: ResourceAnomalyCountTimeseriesFragment['timeseries'];
  totalAnomaliesCount: number;
  performance: { value: number | string; metric: string } | null;
  totalFeatures: number;
  columnsWithDriftAnomalies: number;
  columnsWithDQAnomalies: number;
  inputVolume: number;
  dataAvailability: { oldestTimestamp?: Maybe<number>; latestTimestamp?: Maybe<number> };
};
export type FetchedQuery<T> = {
  data: T[];
  loading: boolean;
  error: boolean;
};

const isModelLike = (resourceCategory: AssetCategory | null): boolean => {
  return resourceCategory === AssetCategory.Model || resourceCategory === AssetCategory.Llm;
};

const isWrongCategory = (isModel: boolean, resourceCategory: AssetCategory | null): boolean => {
  if (resourceCategory === AssetCategory.Data && isModel) return true;
  return !resourceCategory || (isModelLike(resourceCategory) && !isModel);
};

const getMetricValue = (
  metric: string,
  metricsArray: ResourcesExecutiveTableInfoFragment['metrics'],
): string | null => {
  const metricObject = metricsArray?.find((m) => m.name === metric);
  return metricObject?.values[0]?.value.toFixed(5) ?? null;
};

const handleResourcePerformance = (
  resource: ResourcesExecutiveTableInfoFragment,
): ResourcesTableInfo['performance'] => {
  const { metrics } = resource;
  const accuracyValue = getMetricValue('accuracy', metrics);
  const meanSquaredErrorValue = getMetricValue('mean_squared_error', metrics);
  const accuracy = accuracyValue !== null ? { metric: 'Accuracy', value: asPercentage(Number(accuracyValue)) } : null;
  const meanSquaredError = meanSquaredErrorValue !== null ? { metric: 'MSE', value: meanSquaredErrorValue } : null;
  switch (resource.modelType) {
    case ModelType.Classification:
      return accuracy;
    case ModelType.Regression:
      return meanSquaredError;
  }
  return accuracy ?? meanSquaredError;
};

export const translateAnomaliesData = (
  isModel: boolean,
  data: ResourcesExecutiveTableInfoFragment[] = [],
): ResourcesTableInfo[] => {
  const resources: ResourcesTableInfo[] = [];
  data.forEach((resource) => {
    if (isWrongCategory(isModel, resource.assetCategory ?? null)) return;

    const inputVolume = resource.batches?.reduce((sum, batch) => sum + batch.inputCount, 0) ?? 0;
    const performance = handleResourcePerformance(resource);
    const timeseries = resource.allAnomalyCounts?.timeseries ?? [];
    const totalAnomaliesCount = timeseries.reduce((acc, curr) => {
      const dayCount = curr.counts.reduce((dayTotal, current) => dayTotal + current.count, 0);
      return acc + dayCount;
    }, 0);

    resources.push({
      id: resource.id,
      name: resource.name,
      timeseries,
      totalAnomaliesCount,
      totalFeatures: resource.entitySchema?.inputCounts.total ?? 0,
      columnsWithDriftAnomalies: 0,
      columnsWithDQAnomalies: 0,
      inputVolume,
      performance,
      dataAvailability: resource.freshness ?? {},
    });
  });
  return resources;
};
