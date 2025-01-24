import { JSONObject } from 'types/genericTypes';

export const NO_PRESET_ID = 'no-preset-selected';
const LLM_PRESETS = [
  'llm-prompt-data-leakage-fixed-analyzer',
  'llm-response-data-leakage-fixed-analyzer',
  'llm-prompt-injection-stddev-trailing-window-analyzer',
  'llm-response-low-relevance-trailing-window-analyzer',
  'llm-prompt-negativity-stddev-trailing-window-analyzer',
  'llm-response-negativity-stddev-trailing-window-analyzer',
  'llm-response-refusal-stddev-trailing-window-analyzer',
  'llm-prompt-toxicity-stddev-trailing-window-analyzer',
  'llm-response-toxicity-stddev-trailing-window-analyzer',
] as const;

/* When adding a new presetId here, we need to create the preset code
  and add in the ./index.ts on customJsonAnalyzerPresetsMapper
*/
export const AVAILABLE_PRESETS = [
  NO_PRESET_ID,
  'late-upload-analyzer',
  'missing-profile-analyzer',
  'count-null-ratio-pct-trailing-window-analyzer',
  'unique-est-pct-trailing-window-analyzer',
  'count-null-ratio-pct-static-profile-analyzer',
  'unique-est-pct-static-profile-analyzer',
  'count-null-ratio-stddev-fixed-time-range-analyzer',
  'unique-est-stddev-fixed-time-range-analyzer',
  'statistics-positive-non-discrete-fixed-analyzer',
  ...LLM_PRESETS,
] as const;
export type JsonPresets = typeof AVAILABLE_PRESETS[number];

/* When adding a new option of programmatic change, we need to implement the replacement
  in the ./useJsonPresetCode.ts on handleProgrammaticReplace()
*/
export const AVAILABLE_PROGRAMMATIC_CHANGES = [
  '$auto_fill_dataset_timestamp_offset',
  '$auto_fill_cadence',
  '$auto_fill_seconds_batch_worth',
  '$auto_fill_trailing_window_size',
] as const;
export type ProgrammaticChange = typeof AVAILABLE_PROGRAMMATIC_CHANGES[number];

export type PresetCheckList = {
  description: JSX.Element;
  configurationSteps: JSX.Element[];
  additionalInfo?: JSX.Element;
};
export type JsonPreset = {
  readonly baseConfig: JSONObject;
  readonly programmaticChanges: ProgrammaticChange[];
  readonly presetName: string; // Label displayed in JSON editor header and in presets list
  readonly displayName?: string; // value inserted into monitor.displayname field
  readonly checkList?: PresetCheckList;
};

/* Use this token as a value on a preset config field
  when you want to require the user to update the value
*/
export const REPLACE_REQUIRED_TOKEN = 'replace_this_value';
