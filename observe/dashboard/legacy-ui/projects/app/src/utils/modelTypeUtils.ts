import { AssetCategory, Maybe, ModelType } from 'generated/graphql';
import { NullishString } from 'types/genericTypes';
import { logOrThrowError } from 'utils/logUtils';

export const DATASET_TYPES = [
  ModelType.DataSource,
  ModelType.DataStream,
  ModelType.DataTransform,
  ModelType.DataOther,
] as const;

export const SecuredLLM: `secured-${ModelType.Llm}` = `secured-${ModelType.Llm}`;

export const MODEL_TYPES = [
  ModelType.Classification,
  ModelType.Embeddings,
  ModelType.Llm,
  ModelType.Ranking,
  ModelType.Regression,
  ModelType.ModelOther,
] as const;

export const OTHER_TYPES = [ModelType.Unknown] as const;

// new resource types introduced as part of the dataops epic
export const RESOURCE_TYPES: Set<ModelType> = new Set([...DATASET_TYPES, ...MODEL_TYPES, ...OTHER_TYPES]);

export function getAvailableModelTypes(): ModelType[] {
  return [...RESOURCE_TYPES];
}

export function getLabelForModelType(key: ModelType | typeof SecuredLLM): string {
  const labels: Record<ModelType | typeof SecuredLLM, string> = {
    [ModelType.Classification]: 'Classification model',
    [ModelType.Regression]: 'Regression model',
    [ModelType.Embeddings]: 'Embeddings model',
    [ModelType.Llm]: 'Large language model (LLM)',
    [SecuredLLM]: 'Secured LLM',
    [ModelType.Ranking]: 'Ranking model',
    [ModelType.ModelOther]: 'Other model',
    [ModelType.DataSource]: 'Data source',
    [ModelType.DataStream]: 'Data stream',
    [ModelType.DataTransform]: 'Data transform',
    [ModelType.DataOther]: 'Other dataset',
    [ModelType.Unknown]: 'Not defined',
  };

  if (labels[key]) return labels[key];

  return logOrThrowError(`Must define a label to the ModelType: ${key}`);
}

export function getGroupLabelForModelType(key: ModelType): string {
  const models: ModelType[] = [
    ModelType.Classification,
    ModelType.Regression,
    ModelType.Embeddings,
    ModelType.Llm,
    ModelType.Ranking,
    ModelType.ModelOther,
  ];
  const datasets: ModelType[] = [
    ModelType.DataSource,
    ModelType.DataStream,
    ModelType.DataTransform,
    ModelType.DataOther,
  ];

  if (models.includes(key)) return 'Model types';
  if (datasets.includes(key)) return 'Dataset types';
  return '';
}

export function getValidOrUnknownModelType(key: NullishString): ModelType {
  if (key && isModelType(key)) return key;

  return ModelType.Unknown;
}

export function isModelType(key: NullishString): key is ModelType {
  if (!key) return false;
  return Object.values(ModelType).includes(key as ModelType);
}

export function isItModelOrDataTransform({
  category,
  type,
}: {
  category: Maybe<AssetCategory> | undefined;
  type: ModelType;
}): boolean {
  const isModelCategory = category && [AssetCategory.Model, AssetCategory.Llm].includes(category);
  const isDataTransform = type === ModelType.DataTransform;

  return isModelCategory || isDataTransform;
}
