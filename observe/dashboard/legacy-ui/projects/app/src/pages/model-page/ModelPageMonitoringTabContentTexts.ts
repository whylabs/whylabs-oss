import { FeatureFilterTexts, OutputFilterTexts } from 'pages/shared/FeatureFilterTexts';

export const ModelPageMonitoringTabContentTexts = {
  DATA: {
    ...FeatureFilterTexts.DATA,
    nameHeaderTitle: 'Column',
    inputsTab: 'Columns',
  },
  MODEL: {
    ...FeatureFilterTexts.MODEL,
    nameHeaderTitle: 'Feature',
    inputsTab: 'Inputs',
  },
  LLM: {
    ...FeatureFilterTexts.LLM,
    nameHeaderTitle: 'Metric',
    inputsTab: 'Telemetry Explorer',
  },
};

export const ModelOutputTabContentTexts = {
  DATA: {
    ...OutputFilterTexts.DATA,
    nameHeaderTitle: 'Column',
  },
  MODEL: {
    ...OutputFilterTexts.MODEL,
    nameHeaderTitle: 'Output',
  },
  LLM: {
    ...OutputFilterTexts.LLM,
    nameHeaderTitle: 'Metric',
  },
};
