import { emptyAnalyzerPreset, emptyMonitorPreset } from './base-configs/freeCreationFlowPreset';
import {
  uniqueValuesStaticProfilePreset,
  uniqueValuesStddevFixedTimeRangePreset,
  uniqueValuesTrailingWindowPreset,
} from './base-configs/unique-value';
import {
  missingValuesStaticProfilePreset,
  missingValuesTrailingWindowPreset,
  missingValuesStddevFixedTimeRangePreset,
} from './base-configs/missing-value';
import { JsonPreset, JsonPresets } from './types';
import { missingProfilePreset, lateUploadPreset } from './base-configs/data-availability';
import { positiveNonDiscreteStatisticFixedPreset } from './base-configs/statistics/positiveNonDiscreteStatisticFixedPreset';
import { promptDataLeakageFixedPreset, responseDataLeakageFixedPreset } from './base-configs/llms/has-patterns';
import { promptInjectionStddevTrailingPreset } from './base-configs/llms/injection';
import { responseLowRelevancePreset } from './base-configs/llms/low-relevance';
import {
  promptNegativityStddevTrailingWindowPreset,
  responseNegativityStddevTrailingWindowPreset,
} from './base-configs/llms/negativity';
import { responseRefusalStddevTrailingWindowPreset } from './base-configs/llms/refusal';
import { responseToxicityStddevTrailingWindowPreset } from './base-configs/llms/toxicity';

export const customJsonAnalyzerPresetsMapper = new Map<JsonPresets, JsonPreset>([
  ['no-preset-selected', emptyAnalyzerPreset],
  ['unique-est-pct-trailing-window-analyzer', uniqueValuesTrailingWindowPreset],
  ['unique-est-pct-static-profile-analyzer', uniqueValuesStaticProfilePreset],
  ['unique-est-stddev-fixed-time-range-analyzer', uniqueValuesStddevFixedTimeRangePreset],
  ['count-null-ratio-pct-trailing-window-analyzer', missingValuesTrailingWindowPreset],
  ['count-null-ratio-pct-static-profile-analyzer', missingValuesStaticProfilePreset],
  ['count-null-ratio-stddev-fixed-time-range-analyzer', missingValuesStddevFixedTimeRangePreset],
  ['statistics-positive-non-discrete-fixed-analyzer', positiveNonDiscreteStatisticFixedPreset],
  ['missing-profile-analyzer', missingProfilePreset],
  ['late-upload-analyzer', lateUploadPreset],
  ['llm-prompt-data-leakage-fixed-analyzer', promptDataLeakageFixedPreset],
  ['llm-response-data-leakage-fixed-analyzer', responseDataLeakageFixedPreset],
  ['llm-prompt-injection-stddev-trailing-window-analyzer', promptInjectionStddevTrailingPreset],
  ['llm-response-low-relevance-trailing-window-analyzer', responseLowRelevancePreset],
  ['llm-prompt-negativity-stddev-trailing-window-analyzer', promptNegativityStddevTrailingWindowPreset],
  ['llm-response-negativity-stddev-trailing-window-analyzer', responseNegativityStddevTrailingWindowPreset],
  ['llm-response-refusal-stddev-trailing-window-analyzer', responseRefusalStddevTrailingWindowPreset],
  ['llm-response-toxicity-stddev-trailing-window-analyzer', responseToxicityStddevTrailingWindowPreset],
]);

// All the other non specified presets will use genericMonitorPreset.ts
export const customJsonMonitorPresetsMapper = new Map<JsonPresets, JsonPreset>([
  ['no-preset-selected', emptyMonitorPreset],
]);
