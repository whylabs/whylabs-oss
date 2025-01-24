export type NonNullSchemaSummary = {
  __typename: 'SchemaSummary';
  inference: {
    __typename: 'TypeInference';
    count: number;
  };
};
