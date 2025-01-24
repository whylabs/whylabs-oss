import { AssetCategory } from 'generated/graphql';
import { atom, RecoilState } from 'recoil';
import { CategoryKeys } from 'strings/types';
import { CustomCard, SUMMARY_CARD_ID } from 'pages/model-page/model-summary-page/SummaryCard';

const MODEL_SUMMARY_CARDS_STATE: CustomCard[] = [
  { column: 0, order: 0, id: SUMMARY_CARD_ID.DATA_PROFILES, show: true, title: 'Data Profiles' },
  { column: 0, order: 1, id: SUMMARY_CARD_ID.PROJECT, show: true, title: 'Resource Details' },
  { column: 1, order: 0, id: SUMMARY_CARD_ID.INTEGRATION_HEALTH, show: true, title: 'Integration Health' },
  { column: 1, order: 1, id: SUMMARY_CARD_ID.MONITOR_COVERAGE, show: true, title: 'Monitoring Coverage' },
  { column: 2, order: 0, id: SUMMARY_CARD_ID.INPUT_HEALTH, show: true, title: 'Input Health' },
  { column: 2, order: 1, id: SUMMARY_CARD_ID.OUTPUT_HEALTH, show: true, title: 'Model Health' },
  { column: 0, order: 2, id: SUMMARY_CARD_ID.MONITOR_STATUS, show: true, title: 'Monitor Status' },
  { column: 3, order: 1, id: SUMMARY_CARD_ID.SEGMENTS, show: true, title: 'Segments' },
  { column: 3, order: 0, id: SUMMARY_CARD_ID.MODEL_PERFORMANCE, show: true, title: 'Model Performance' },
  { column: 4, order: 0, id: SUMMARY_CARD_ID.ANOMALY_SUMMARY, show: true, title: 'Anomaly Summary' },
  { column: 4, order: 1, id: SUMMARY_CARD_ID.EXPLAINABILITY, show: false, title: 'Explainability' },
  { column: 4, order: 0, id: SUMMARY_CARD_ID.GETTING_STARTED, show: false, title: 'Getting started' },
];

const DATA_SUMMARY_CARDS_STATE: CustomCard[] = [
  { column: 0, order: 0, id: SUMMARY_CARD_ID.DATA_PROFILES, show: true, title: 'Data Profiles' },
  { column: 0, order: 1, id: SUMMARY_CARD_ID.PROJECT, show: true, title: 'Resource Details' },
  { column: 1, order: 0, id: SUMMARY_CARD_ID.INTEGRATION_HEALTH, show: true, title: 'Integration Health' },
  { column: 1, order: 1, id: SUMMARY_CARD_ID.MONITOR_COVERAGE, show: true, title: 'Monitoring Coverage' },
  { column: 2, order: 0, id: SUMMARY_CARD_ID.INPUT_HEALTH, show: true, title: 'Columns Health' },
  { column: 3, order: 2, id: SUMMARY_CARD_ID.MONITOR_STATUS, show: true, title: 'Monitor Status' },
  { column: 3, order: 0, id: SUMMARY_CARD_ID.ANOMALY_SUMMARY, show: true, title: 'Anomalies, previous day' },
  { column: 4, order: 0, id: SUMMARY_CARD_ID.SEGMENTS, show: true, title: 'Segments' },
  { column: 4, order: 1, id: SUMMARY_CARD_ID.GETTING_STARTED, show: false, title: 'Getting started' },
];

const DATA_TRANSFORM_SUMMARY_CARDS_STATE: CustomCard[] = [
  { column: 0, order: 0, id: SUMMARY_CARD_ID.DATA_PROFILES, show: true, title: 'Data Profiles' },
  { column: 0, order: 1, id: SUMMARY_CARD_ID.PROJECT, show: true, title: 'Resource Details' },
  { column: 1, order: 0, id: SUMMARY_CARD_ID.INTEGRATION_HEALTH, show: true, title: 'Integration Health' },
  { column: 1, order: 1, id: SUMMARY_CARD_ID.MONITOR_COVERAGE, show: true, title: 'Monitoring Coverage' },
  { column: 2, order: 0, id: SUMMARY_CARD_ID.INPUT_HEALTH, show: true, title: 'Input Health' },
  { column: 2, order: 1, id: SUMMARY_CARD_ID.OUTPUT_HEALTH, show: true, title: 'Output Health' },
  { column: 3, order: 2, id: SUMMARY_CARD_ID.MONITOR_STATUS, show: true, title: 'Monitor Status' },
  { column: 3, order: 0, id: SUMMARY_CARD_ID.ANOMALY_SUMMARY, show: true, title: 'Anomalies, previous day' },
  { column: 4, order: 0, id: SUMMARY_CARD_ID.SEGMENTS, show: true, title: 'Segments' },
  { column: 4, order: 1, id: SUMMARY_CARD_ID.GETTING_STARTED, show: false, title: 'Getting started' },
];

const LLM_SUMMARY_CARDS_STATE: CustomCard[] = [
  { column: 0, order: 0, id: SUMMARY_CARD_ID.DATA_PROFILES, show: true, title: 'Data Profiles' },
  { column: 0, order: 1, id: SUMMARY_CARD_ID.PROJECT, show: true, title: 'Resource Details' },
  { column: 1, order: 0, id: SUMMARY_CARD_ID.INTEGRATION_HEALTH, show: true, title: 'Integration Health' },
  { column: 1, order: 1, id: SUMMARY_CARD_ID.MONITOR_COVERAGE, show: true, title: 'Monitoring Coverage' },
  { column: 2, order: 0, id: SUMMARY_CARD_ID.LLM_SECURITY, show: true, title: 'Security' },
  { column: 2, order: 1, id: SUMMARY_CARD_ID.INPUT_HEALTH, show: true, title: 'Telemetry Health' },
  { column: 3, order: 0, id: SUMMARY_CARD_ID.LLM_PERFORMANCE, show: true, title: 'Performance' },
  { column: 3, order: 1, id: SUMMARY_CARD_ID.LLM_SECURE, show: true, title: 'LLM Secure' },
  // { column: 3, order: 1, id: SUMMARY_CARD_ID.LLM_SENTIMENT, show: true, title: 'Sentiment' }, TODO: will be added later (#86ay8fay5)
  { column: 3, order: 2, id: SUMMARY_CARD_ID.MONITOR_STATUS, show: true, title: 'Monitor Status' },
  { column: 4, order: 0, id: SUMMARY_CARD_ID.GETTING_STARTED, show: false, title: 'Getting started' },
  { column: 4, order: 1, id: SUMMARY_CARD_ID.ANOMALY_SUMMARY, show: true, title: 'Anomalies, previous day' },
  { column: 4, order: 2, id: SUMMARY_CARD_ID.SEGMENTS, show: true, title: 'Segments' },
];

const modelCardsAtom = atom({
  key: 'ModelSummaryCards',
  default: MODEL_SUMMARY_CARDS_STATE,
});

const dataCardsAtom = atom({
  key: 'DataSummaryCards',
  default: DATA_SUMMARY_CARDS_STATE,
});

const dataTransformCardsAtom = atom({
  key: 'DataTransformSummaryCards',
  default: DATA_TRANSFORM_SUMMARY_CARDS_STATE,
});

const llmTransformCardsAtom = atom({
  key: 'LLMSummaryCards',
  default: LLM_SUMMARY_CARDS_STATE,
});

export function getSummaryCardsAtom(category: CategoryKeys, isDataTransform: boolean): RecoilState<CustomCard[]> {
  if (isDataTransform) return dataTransformCardsAtom;

  if (category === AssetCategory.Llm) return llmTransformCardsAtom;

  if (category === AssetCategory.Data) return dataCardsAtom;

  return modelCardsAtom;
}
