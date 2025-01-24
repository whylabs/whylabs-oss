import { ModelType } from '~server/graphql/generated/graphql';

import { logOrThrowError } from './logUtils';

const UNKNOWN_LABEL = 'Not defined';

const resourceTypeUtilsLabels = new Map<ModelType, string>([
  [ModelType.Classification, 'Classification model'],
  [ModelType.Regression, 'Regression model'],
  [ModelType.Embeddings, 'Embeddings model'],
  [ModelType.Llm, 'Large language model (LLM)'],
  [ModelType.Ranking, 'Ranking model'],
  [ModelType.ModelOther, 'Other model'],
  [ModelType.DataSource, 'Data source'],
  [ModelType.DataStream, 'Data stream'],
  [ModelType.DataTransform, 'Data transform'],
  [ModelType.DataOther, 'Other dataset'],
  [ModelType.Unknown, UNKNOWN_LABEL],
]);

export function getLabelForModelType(key: ModelType): string | null {
  const label = resourceTypeUtilsLabels.get(key);
  if (label) return label;
  return logOrThrowError(`Must implement label for unmapped resource type ${key}`);
}

export function safeGetLabelForModelType(key: ModelType): string | null {
  const label = resourceTypeUtilsLabels.get(key);
  if (label) return label;
  return UNKNOWN_LABEL;
}

export const mapStringToResourceType = new Map<string, ModelType>([
  ['CLASSIFICATION', ModelType.Classification],
  ['DATA_OTHER', ModelType.DataOther],
  ['DATA_SOURCE', ModelType.DataSource],
  ['DATA_STREAM', ModelType.DataStream],
  ['DATA_TRANSFORM', ModelType.DataTransform],
  ['EMBEDDINGS', ModelType.Embeddings],
  ['LLM', ModelType.Llm],
  ['MODEL_OTHER', ModelType.ModelOther],
  ['RANKING', ModelType.Ranking],
  ['REGRESSION', ModelType.Regression],
  ['UNKNOWN', ModelType.Unknown],
]);

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
