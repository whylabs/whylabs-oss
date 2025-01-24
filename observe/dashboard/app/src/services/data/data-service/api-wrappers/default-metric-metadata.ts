import fs from 'fs';

import { flatten, uniq } from 'lodash';

import { analysisMetricToDataService } from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import { AnalysisMetric } from '../../../../graphql/generated/graphql';
/*
 This is temporary pending implementation in data service. Its generating a starter JSON object
 from the original hardcoded metadata.
 */
import { DefaultColumnMetadata, MetricMetadata } from '../../metric-metadata';

const llmColumnDescriptions: Map<string, string> = new Map([
  [
    'sentiment_nltk',
    'Sentiment score between -1 (most negative) and 1 (most positive) calculated using Vader analysis.',
  ],
  [
    'toxicity',
    "Toxicity score between 0 (no toxicity) and 1(maximum toxicity) calculated using HuggingFace's toxic comment analyzer.",
  ],
  [
    'flesch_kincaid_grade',
    'A number equivalent to the US grade level of education required to be able to understand a text.',
  ],
  [
    'flesch_reading_ease',
    'Readability score based on sentence length and word length, with higher scores indicating material that is easier to read.',
  ],
  ['data_leakage', 'A distribution of the patterns that have been matched in the text'],
  ['jailbreak_similarity', 'Maximum cosine similarity of text embedding compared to provided jailbreaks'],
  [
    'injection',
    'Score indicating the likelihood of injection in the text, with higher scores indicating higher likelihood',
  ],
  ['refusal_similarity', 'Maximum cosine similarity of text embedding compared to provided refusals'],
  ['difficult_words', 'Number of words not considered easy in the dalle-chall readability formula.'],
  [
    'relevance_to_prompt',
    'Semantic similarity of response to the prompt measured by cosine similarity of produced embeddings.',
  ],
  ['smog_index', 'US grade level of education required to be able to understand a text.'],
  ['coleman_liau_index', 'US grade level of education required to be able to understand a text.'],
  ['automated_readability_index', 'US grade level of education required to be able to understand a text.'],
  ['dale_chall_readability_score', 'US grade level of education required to be able to understand a text.'],
  ['linsear_write_formula', 'US grade level of education required to be able to understand a text.'],
  ['gunning_fog', 'US grade level of education required to be able to understand a text.'],
  ['aggregate_reading_level', 'US grade level of education required to be able to understand a text.'],
  ['fernandez_huerta', 'US grade level of education required to be able to understand a text.'],
  ['szigriszt_pazos', 'US grade level of education required to be able to understand a text.'],
  ['gutierrez_polini', 'US grade level of education required to be able to understand a text.'],
  ['crawford', 'US grade level of education required to be able to understand a text.'],
  ['gulpease_index', 'Score indicating readability of Italian texts, with higher scores being easier to read.'],
  [
    'osman',
    'Readability score based on sentence length and word length, with higher scores indicating material that is easier to read.',
  ],
  ['syllable_count', 'The number of syllables present in the text.'],
  ['lexicon_count', 'The number of words present in the text.'],
  ['sentence_count', 'The number of sentences present in the text.'],
  ['character_count', 'The number of characters present in the text.'],
  ['letter_count', 'The number of letters present in the text.'],
  ['polysyllable_count', 'The number of words with three or  more syllables present in the text.'],
  ['monosyllable_count', 'The number of words with one syllable present in the text.'],
]);

const llmColumnTags: Map<string, string[]> = new Map([
  ['sentiment_nltk', ['sentiment', 'security']],
  ['toxicity', ['sentiment', 'security']],
  ['flesch_reading_ease', ['quality', 'performance']],
  ['flesch_kincaid_grade', ['quality', 'performance']],
  ['relevance_to_prompt', ['relevance', 'performance']],
  ['jailbreak_similarity', ['security']],
  ['injection', ['security']],
  ['data_leakage', ['security']],
  ['refusal_similarity', ['security']],
  ['difficult_words', ['quality']],
  ['smog_index', ['quality', 'performance']],
  ['coleman_liau_index', ['quality', 'performance']],
  ['automated_readability_index', ['quality', 'performance']],
  ['dale_chall_readability_score', ['quality', 'performance']],
  ['linsear_write_formula', ['quality', 'performance']],
  ['gunning_fog', ['quality', 'performance']],
  ['aggregate_reading_level', ['quality', 'performance']],
  ['fernandez_huerta', ['quality', 'performance']],
  ['szigriszt_pazos', ['quality', 'performance']],
  ['gutierrez_polini', ['quality', 'performance']],
  ['crawford', ['quality', 'performance']],
  ['gulpease_index', ['quality', 'performance']],
  ['osman', ['quality', 'performance']],
  ['syllable_count', ['quality']],
  ['lexicon_count', ['quality']],
  ['sentence_count', ['quality']],
  ['character_count', ['quality']],
  ['letter_count', ['quality']],
  ['polysyllable_count', ['quality']],
  ['monosyllable_count', ['quality']],
]);

// Metric for discrete defaults to FrequentItems and for non-discrete defaults to Mean
// Place override values here
const llmMetricOverrides: Map<string, AnalysisMetric[]> = new Map([
  ['jailbreak_similarity', [AnalysisMetric.Quantile_99]],
  ['injection', [AnalysisMetric.Quantile_99]],
  ['refusal_similarity', [AnalysisMetric.Quantile_99]],
  ['data_leakage', [AnalysisMetric.FrequentItems, AnalysisMetric.UniqueEst]],
]);

// the column names representing llm metrics
const llmMetricNames: string[] = uniq(
  flatten([Array.from(llmColumnDescriptions.keys()), Array.from(llmColumnTags.keys())]),
);

// const generateLabel = (name: string) => {
//   const result = `${name}`.replace(/[_.]/g, ' ');
//   return result.charAt(0).toUpperCase() + result.slice(1);
// };

const constructDefaultLlmMetricDefinitions = (): DefaultColumnMetadata[] => {
  const definitions: DefaultColumnMetadata[] = [];
  ['prompt.', 'response.'].forEach((prefix) => {
    llmMetricNames.forEach((name) => {
      const queryMetrics = llmMetricOverrides.get(name) ?? [AnalysisMetric.Mean];
      const colName = `${prefix}${name}`;
      definitions.push({
        name: colName,
        description: llmColumnDescriptions.get(name),
        tags: llmColumnTags.get(name) ?? [],
        metrics: queryMetrics.map((metric) => {
          const dsMetric = analysisMetricToDataService(metric);
          return {
            name: `${colName}.${dsMetric.valueOf()}`,
            label: colName, // may choose to use generateLabel instead to get a better name
            builtinMetric: dsMetric,
          };
        }),
      });
    });
  });
  return definitions;
};

export const DEFAULT_METRIC_METADATA: MetricMetadata = {
  metadata: {
    llm: {
      columnMetadata: constructDefaultLlmMetricDefinitions(),
      aliases: {
        ['prompt.has_patterns']: 'prompt.data_leakage',
        ['response.has_patterns']: 'response.data_leakage',
      },
    },
  },
};

const main = async () => {
  const content = JSON.stringify(DEFAULT_METRIC_METADATA, null, 2);
  await fs.promises.writeFile('metric_metadata.json', content);
};

if (require.main === module) {
  main();
}
