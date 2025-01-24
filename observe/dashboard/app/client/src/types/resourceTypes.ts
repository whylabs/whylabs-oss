import { ModelType } from '~server/graphql/generated/graphql';

export interface OrgAndResource {
  orgId: string;
  resourceId: string;
}

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
