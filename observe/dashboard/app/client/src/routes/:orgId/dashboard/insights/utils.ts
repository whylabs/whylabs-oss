export enum InsightType {
  HIGH_CARDINALITY = 'data_high_cardinality',
  NULL_VALUES = 'data_null_values',
  MIXED_DATA_TYPE = 'data_mixed_data_types',
  IMBALANCED = 'data_imbalance',
  LLM_TOXICITY = 'llm_toxicity',
  LLM_NEGATIVE_SENTIMENT = 'llm_negative_sentiment',
  LLM_POSITIVE_SENTIMENT = 'llm_positive_sentiment',
  LLM_JAILBREAK_SIMILARITY = 'llm_jailbreak',
  LLM_READING_EASE = 'llm_reading_ease',
  LLM_REFUSAL = 'llm_refusal',
  LLM_RESUAL = 'llm_resual',
  LLM_PATTERNS = 'llm_patterns',
}

export const insightsNameMapper = new Map<string, string>([
  [InsightType.IMBALANCED, 'IMBALANCED'],
  [InsightType.LLM_TOXICITY, 'TOXICITY'],
  [InsightType.LLM_RESUAL, 'REFUSAL'],
  [InsightType.LLM_PATTERNS, 'PATTERNS'],
  [InsightType.LLM_POSITIVE_SENTIMENT, 'POSITIVE SENTIMENT'],
  [InsightType.LLM_NEGATIVE_SENTIMENT, 'NEGATIVE SENTIMENT'],
]);
