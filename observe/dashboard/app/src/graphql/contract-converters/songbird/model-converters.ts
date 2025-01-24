import { Granularity } from '@whylabs/data-service-node-client';
import { ModelMetadataResponse, ModelType, TimePeriod } from '@whylabs/songbird-node-client';

import { getLogger } from '../../../providers/logger';
import { invertMap } from '../../../util/contract-utils';
import { fnThrow } from '../../../util/misc';
import {
  AssetCategory,
  CustomTag,
  ModelType as GQLAssetType,
  TimePeriod as GQLTimePeriod,
  Maybe,
  Model,
} from '../../generated/graphql';

const logger = getLogger('ModelConverterLogger');

export const contractTimePeriodToGQL = (period?: string | null): GQLTimePeriod => {
  switch (period) {
    case TimePeriod.P1M:
      return GQLTimePeriod.P1M;
    case TimePeriod.P1W:
      return GQLTimePeriod.P1W;
    case TimePeriod.P1D:
      return GQLTimePeriod.P1D;
    case TimePeriod.Pt1H:
      return GQLTimePeriod.Pt1H;
    case undefined:
    case null:
      return GQLTimePeriod.Unknown;
    default:
      logger.error('Found unknown model time period: %s', period);
      return GQLTimePeriod.Unknown;
  }
};

export const timePeriodToDataServiceGranularity = (period: GQLTimePeriod): Granularity => {
  switch (period) {
    case GQLTimePeriod.P1M:
      return Granularity.Monthly;
    case GQLTimePeriod.P1W:
      return Granularity.Weekly;
    case GQLTimePeriod.P1D:
      return Granularity.Daily;
    case GQLTimePeriod.Pt1H:
      return Granularity.Hourly;
    case GQLTimePeriod.Individual:
      return Granularity.Individual;
    default:
      logger.error('Found unknown time period: %s', period);
      return Granularity.Daily;
  }
};

export const gqlTimePeriodToContract = (period: GQLTimePeriod): TimePeriod => {
  switch (period) {
    case GQLTimePeriod.P1M:
      return TimePeriod.P1M;
    case GQLTimePeriod.P1W:
      return TimePeriod.P1W;
    case GQLTimePeriod.P1D:
      return TimePeriod.P1D;
    case GQLTimePeriod.Pt1H:
      return TimePeriod.Pt1H;
    case GQLTimePeriod.Unknown:
      // default to daily
      return TimePeriod.P1D;
    default:
      throw Error(`Found unknown model GQL time period: ${period}`);
  }
};

const defaultAssetType = GQLAssetType.Unknown;

const assetTypeMap = new Map<ModelType | undefined, GQLAssetType>([
  // models
  [ModelType.Classification, GQLAssetType.Classification],
  [ModelType.Regression, GQLAssetType.Regression],
  [ModelType.Embeddings, GQLAssetType.Embeddings],
  [ModelType.Llm, GQLAssetType.Llm],
  [ModelType.Ranking, GQLAssetType.Ranking],
  [ModelType.ModelOther, GQLAssetType.ModelOther],

  // datasets
  [ModelType.DataSource, GQLAssetType.DataSource],
  [ModelType.DataStream, GQLAssetType.DataStream],
  [ModelType.DataTransform, GQLAssetType.DataTransform],
  [ModelType.DataOther, GQLAssetType.DataOther],

  // unset type
  [undefined, defaultAssetType],
]);

const invertedAssetTypeMap = invertMap(assetTypeMap);

export const parseModelType = (modelType: string): ModelType => {
  switch (modelType) {
    case ModelType.Classification:
      return ModelType.Classification;
    case ModelType.Regression:
      return ModelType.Regression;
    case ModelType.Embeddings:
      return ModelType.Embeddings;
    case ModelType.Llm:
      return ModelType.Llm;
    case ModelType.Ranking:
      return ModelType.Ranking;
    case ModelType.ModelOther:
      return ModelType.ModelOther;
    case ModelType.DataSource:
      return ModelType.DataSource;
    case ModelType.DataStream:
      return ModelType.DataStream;
    case ModelType.DataTransform:
      return ModelType.DataTransform;
    case ModelType.DataOther:
      return ModelType.DataOther;
    default:
      return ModelType.ModelOther;
  }
};

export const contractAssetTypeToGQL = (contractAssetType?: ModelType | string | null): GQLAssetType => {
  const type = !contractAssetType ? undefined : parseModelType(contractAssetType);
  const assetType = assetTypeMap.get(type);
  if (!assetType) {
    logger.error('Found unknown asset type: %s', contractAssetType);
    return defaultAssetType;
  }

  return assetType;
};

export const gqlAssetTypeToContract = (modelType: Maybe<GQLAssetType>): ModelType | undefined => {
  const modelTypeOrDefault = modelType ?? defaultAssetType;
  if (invertedAssetTypeMap.has(modelTypeOrDefault)) {
    return invertedAssetTypeMap.get(modelTypeOrDefault);
  }

  return fnThrow(`Unsupported modelType ${modelType}`);
};

export const assetTypeToClass = (assetType: GQLAssetType): AssetCategory => {
  const modelTypes: Set<GQLAssetType> = new Set([
    GQLAssetType.Classification,
    GQLAssetType.Regression,
    GQLAssetType.Embeddings,
    GQLAssetType.Ranking,
    GQLAssetType.ModelOther,
    GQLAssetType.Unknown,
  ]);

  if (assetType === GQLAssetType.Llm) {
    return AssetCategory.Llm;
  }

  return modelTypes.has(assetType) ? AssetCategory.Model : AssetCategory.Data;
};

export type ModelMetadata = Omit<ModelMetadataResponse, 'tags'> & { tags: CustomTag[] };

export const modelMetadataToModel = (metadata: ModelMetadata): Model => ({
  totalFeatures: 0,
  totalSegments: 0,
  totalFilteredSegments: 0,
  name: metadata.name,
  tags: [],
  resourceTags: metadata.tags,
  creationTime: metadata.creationTime,
  id: metadata.id,
  datasetId: metadata.id,
  modelType: contractAssetTypeToGQL(metadata.modelType),
  segments: [],
  alerts: [],
  batchFrequency: contractTimePeriodToGQL(metadata.timePeriod),
  batches: [],
  batchDateRanges: [],
  events: [],
  features: [],
  outputs: [],
  filteredOutputs: {
    results: [],
    totalCount: 0,
  },
  filteredFeatures: {
    results: [],
    totalCount: 0,
  },
  datasetMetrics: [],
  customMetrics: [],
  monitorConfigAuditLogs: [],
  insights: [],
});
