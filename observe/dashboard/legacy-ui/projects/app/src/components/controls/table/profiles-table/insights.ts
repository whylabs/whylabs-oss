import { FeatureSketch, FeatureType, ReferenceProfile } from 'generated/graphql';
import { isNotNullish } from 'utils/nullUtils';

export enum InsightType {
  HIGH_CARDINALITY = 'High Cardinality',
  NULL_VALUES = 'Null Values',
  MIXED_DATA_TYPE = 'Mixed Data Types',
  IMBALANCED = 'Imbalanced',
  LLM_TOXICITY = 'Toxicity',
  LLM_NEGATIVE_SENTIMENT = 'Negative Sentiment',
  LLM_POSITIVE_SENTIMENT = 'Positive Sentiment',
  LLM_JAILBREAK_SIMILARITY = 'Jailbreak',
  LLM_READING_EASE = 'Reading Ease',
  LLM_REFUSAL = 'Refusal',
  LLM_PATTERNS = 'Patterns',
}

export interface Insight {
  type: InsightType;
  /**
   * Intended to come after the name of the feature.
   */
  description: string;
}

type FeatureInsights = Record<string, Insight[]>;

const llmCategorialFeatures = new Set([
  'prompt.aggregate_reading_level',
  'prompt.automated_readability_index',
  'prompt.character_count',
  'prompt.difficult_words',
  'prompt.has_patterns',
  'prompt.jailbreak_similarity',
  'prompt.letter_count',
  'prompt.lexicon_count',
  'prompt.monosyllable_count',
  'prompt.polysyllable_count',
  'prompt.refusal_similarity',
  'prompt.sentence_count',
  'prompt.sentiment_nltk',
  'prompt.syllable_count',
  'prompt.toxicity',
  'prompt.flesch_reading_ease',
  'response.flesch_reading_ease',
  'response.aggregate_reading_level',
  'response.automated_readability_index',
  'response.character_count',
  'response.difficult_words',
  'response.has_patterns',
  'response.jailbreak_similarity',
  'response.letter_count',
  'response.lexicon_count',
  'response.monosyllable_count',
  'response.polysyllable_count',
  'response.refusal_similarity',
  'response.relevance_to_prompt',
  'response.sentence_count',
  'response.sentiment_nltk',
  'response.syllable_count',
  'response.toxicity',
]);

export interface ProfileInsights {
  profileCount: number;
  totalInsights: number;
  insights: Record<string, FeatureInsights>;
}

export type ProfileData = Omit<ReferenceProfile, '__typename'>;

export function createAllProfileInsights(profiles: ProfileData[]): ProfileInsights {
  const insights = profiles.reduce((acc, cur) => {
    acc[cur.id] = createProfileInsights(cur);
    return acc;
  }, {} as Record<string, FeatureInsights>);

  const total = Object.values(insights).reduce(
    (acc, cur) => Object.values(cur).reduce((acc2, cur2) => cur2.length + acc2, 0) + acc,
    0,
  );

  return {
    profileCount: profiles.length,
    totalInsights: total,
    insights,
  };
}

export function createProfileInsights(profile: ProfileData): FeatureInsights {
  // Check for mixed data types
  const results = profile.sketches?.results;

  if (!results) {
    return {};
  }

  const featureInsights = results.map((it) => {
    const { featureName } = it;
    const insights = createFeatureInsights(it);
    return [featureName, insights] as const;
  });

  const flattenedInsights = featureInsights.reduce((acc, cur) => {
    const [featureName, insights] = cur;
    acc[featureName] = insights;
    return acc;
  }, {} as Record<string, Insight[]>);

  return flattenedInsights;
}

function createFeatureInsights(feature: FeatureSketch): Insight[] {
  const insights = insightCreators
    .map((it) => it(feature))
    .reduce((acc, cur) => {
      Array.prototype.push.apply(acc, cur);
      return acc;
    }, []);

  return insights;
}

type InsightCreator = (feature: FeatureSketch) => Insight[];
const insightCreators: InsightCreator[] = [
  createDataTypeInsight,
  createImbalancedInsight,
  createMissingValuesInsight,
  createToxicityInsight,
  createNegativeSentimentInsight,
  createPositiveSentimentInsight,
  createJailbreakSimilarityInsight,
  createReadingEaseInsight,
  createPatternInsight,
  createRefussalInsight,
];

function createMissingValuesInsight(feature: FeatureSketch): Insight[] {
  const { nullCount, nullRatio, featureName } = feature;

  if (llmCategorialFeatures.has(featureName)) {
    return [];
  }

  if (nullCount === 0) {
    return [];
  }

  // Round to two decimal places
  const nullPercent = Math.round(nullRatio * 10000) / 100;

  if (nullPercent < 10) {
    return [];
  }

  return [
    {
      type: InsightType.NULL_VALUES,
      description: `has ${nullCount} (${nullPercent}%) missing values`,
    },
  ];
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function createToxicityInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const max = numberSummary?.max;

  if (!featureName.includes('.toxicity')) {
    return [];
  }

  if (max === null || max === undefined) {
    return [];
  }

  if (max <= 0.8) {
    return [];
  }

  return [
    {
      type: InsightType.LLM_TOXICITY,
      description: `has a max toxicity score of ${round(max)} [0 to 1], where >.5 indicates more offensive language`,
    },
  ];
}

function createNegativeSentimentInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const min = numberSummary?.min;

  if (!featureName.includes('.sentiment')) {
    return [];
  }

  if (min === null || min === undefined) {
    return [];
  }

  if (min >= -0.6) {
    return [];
  }

  const pomptOrResponse = featureName.includes('prompt') ? 'prompt' : 'response';

  return [
    {
      type: InsightType.LLM_NEGATIVE_SENTIMENT,
      description: `has a min sentiment score of ${round(
        min,
      )} of [-1,1], indicating at least one negative sentiment ${pomptOrResponse}, where <0 indicates negative sentiment`,
    },
  ];
}

function createPositiveSentimentInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const mean = numberSummary?.mean;

  if (!featureName.includes('.sentiment')) {
    return [];
  }

  if (mean === null || mean === undefined) {
    return [];
  }

  if (mean <= 0.6) {
    return [];
  }

  const pomptOrResponse = featureName.includes('prompt') ? 'prompts' : 'responses';

  return [
    {
      type: InsightType.LLM_POSITIVE_SENTIMENT,
      description: `has a mean sentiment score of ${round(
        mean,
      )} of [-1,1], indicating high overall positive sentiment ${pomptOrResponse}, where >0 indicates positive sentiment`,
    },
  ];
}

function createJailbreakSimilarityInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const max = numberSummary?.max;
  const mean = numberSummary?.mean;

  if (!featureName.includes('prompt.jailbreak_similarity')) {
    return [];
  }

  if (max === null || max === undefined || mean === null || mean === undefined) {
    return [];
  }

  if (max <= 0.5) {
    return [];
  }

  return [
    {
      type: InsightType.LLM_JAILBREAK_SIMILARITY,
      description: `has a max jailbreak score of ${round(
        max,
      )} of 1, indicating at least one jailbreaking attempt, with an overall mean of ${round(mean)}`,
    },
  ];
}

function createReadingEaseInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const mean = numberSummary?.mean;

  if (!featureName.includes('response.flesch_reading_ease')) {
    return [];
  }

  if (mean === null || mean === undefined) {
    return [];
  }

  if (mean >= 60) {
    return [];
  }

  return [
    {
      type: InsightType.LLM_READING_EASE,
      description: `has a mean flesche reading ease of ${round(
        mean,
      )} of 100 (higher is easier to understand), which implies difficulty understanding responses`,
    },
  ];
}

function createRefussalInsight(feature: FeatureSketch): Insight[] {
  const { numberSummary, featureName } = feature;
  const mean = numberSummary?.mean;
  const max = numberSummary?.max;

  if (featureName !== 'response.refusal_similarity') {
    return [];
  }

  if (mean === null || mean === undefined || max === null || max === undefined) {
    return [];
  }

  if (max <= 0.8) {
    return [];
  }

  return [
    {
      type: InsightType.LLM_REFUSAL,
      description: `has a max refusal score of ${round(
        max,
      )} of 1, indicating at least one likely refusal respones, with an overall mean of ${round(mean)}`,
    },
  ];
}

// TODO this one needs work
function createPatternInsight(feature: FeatureSketch): Insight[] {
  const { frequentItems, featureName, totalCount } = feature;

  if (!featureName.includes('.has_pattern') || totalCount === 0) {
    return [];
  }

  const patterns = frequentItems
    .filter((it) => it.value !== '')
    .filter((it) => typeof it.estimate === 'number' && it.estimate > 0);

  if (patterns.length === 0) {
    return [];
  }

  const promptsOrResponses = featureName.includes('prompt') ? 'prompts' : 'responses';
  const topPattern = patterns[0];
  const topPatternCount = topPattern.estimate;
  const patternCount = patterns.length;

  if (!topPatternCount) {
    return [];
  }

  return [
    {
      type: InsightType.LLM_PATTERNS,
      description: `has ${patternCount} pattern matches, including "${topPattern.value}" with a count of ${topPatternCount} in ${totalCount} ${promptsOrResponses}`,
    },
  ];
}

function createDataTypeInsight(feature: FeatureSketch): Insight[] {
  const counts = feature.schemaSummary?.typeCounts;
  const { totalCount, featureName } = feature;

  if (llmCategorialFeatures.has(featureName)) {
    return [];
  }

  if (!counts) {
    return [];
  }

  const filteredCounts = counts.filter((it) => it.count && it.count > 0 && it.type !== FeatureType.Null);

  if (filteredCounts.length <= 1) {
    return [];
  }

  const details = filteredCounts
    .map((detail) => {
      // Return null if type or count is null/undefined
      if (!detail.type || !detail.count) {
        return null;
      }

      return {
        type: detail.type,
        count: detail.count,
        percentage: Math.round((detail.count / totalCount) * 10000) / 100,
      };
    })
    .filter(isNotNullish);
  const detailStrings = details.map((detail) => `${detail.type} (${detail.percentage}%)`).join(', ');

  return [
    {
      type: InsightType.MIXED_DATA_TYPE,
      description: `has ${details.length} data types: ${detailStrings}`,
    },
  ];
}

function createImbalancedInsight(feature: FeatureSketch): Insight[] {
  const { totalCount, featureName } = feature;

  // Don't show this insight for the llm feature has_patterns. It wouldn't make sense. We just hardcode
  // these LLM features in profiles for now so this is the easiest way to omit it.
  if (llmCategorialFeatures.has(featureName)) {
    return [];
  }

  const imbalancedItems = feature.frequentItems.filter((item) => {
    const { estimate } = item;

    if (!estimate) {
      return false;
    }

    const totalPercent = estimate / totalCount;
    return totalPercent >= 0.5;
  });

  if (imbalancedItems.length === 0) {
    return [];
  }

  const [topImbalance, estimate] = imbalancedItems.map((it) => [it.value, it.estimate] as const)[0];

  let estimatePercent: string;
  if (estimate !== null && estimate !== undefined) {
    const rounded = Math.round((estimate / totalCount) * 10000) / 100;
    estimatePercent = ` (${rounded}%) `;
  } else {
    estimatePercent = ' ';
  }
  return [
    {
      type: InsightType.IMBALANCED,
      description: `is imbalanced because "${topImbalance}" occurs more than 50%${estimatePercent}in ${totalCount} rows`,
    },
  ];
}
