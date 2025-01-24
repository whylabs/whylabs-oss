/* Generates a digest email notification for recent anomalies (within the period specified in `datasetTimesetOffset`)

See https://docs.whylabs.ai/docs/advanced-monitor-configuration/#monitors

  # Required user updates

None

# Common user updates

displayName
severity
actions


# Programmatic updates needed

change displayName to match the preset
replace datasetTimestampOffset to match dataset batch frequency - getDatasetTimestampOffset function already in UI

*/

import { JsonPreset, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from '../types';

const baseConfig = {
  schedule: {
    type: 'immediate',
  },
  mode: {
    type: 'DIGEST',
    datasetTimestampOffset: '$auto_fill_dataset_timestamp_offset',
  },
  displayName: REPLACE_REQUIRED_TOKEN,
  severity: 3,
  actions: [{ type: 'global', target: REPLACE_REQUIRED_TOKEN }],
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_dataset_timestamp_offset'];

export const genericMonitorPreset: JsonPreset = {
  presetName: '',
  baseConfig,
  programmaticChanges,
};
