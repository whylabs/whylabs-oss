/* Generates an anomaly when it has been more than `secondsSinceLastUpload` since a profile was uploaded.

See https://docs.whylabs.ai/docs/advanced-monitor-configuration/#seconds-since-last-upload

# Required user updates
None

# Common user updates
secondsSinceLastUpload


# Programmatic updates needed
update cadence to match dataset batch frequency (cf current preset/custom monitor)
update secondsSinceLastUpload to match 1 batch-worth of seconds
change monitor displayName to "Late upload monitor"


# Christine notes
The docs recommend setting segments to `[{ "tags": [] }]` for the overall dataset. I'm concerned that might not work
for segmented datasets as it may only look at segments with NO tags, which is why I went with unspecified segments.
I'll test this out.
*/
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Late upload monitor';
const displayName = 'Late upload monitor';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'dataset',
    segments: [],
  },
  config: {
    metric: 'secondsSinceLastUpload',
    type: 'fixed',
    upper: '$auto_fill_seconds_batch_worth',
  },
  dataReadinessDuration: 'P1D',
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence', '$auto_fill_seconds_batch_worth'];

const description: JSX.Element = (
  <>
    Generates an anomaly when there has been more than <pre>secondsSinceLastUpload</pre> since a profile was uploaded.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.review_analyzer_config_upper,
];

const additionalInfo = (
  <>
    <span className="red-text">**</span> denotes a required field
  </>
);

const checkList: PresetCheckList = {
  description,
  configurationSteps,
  additionalInfo,
};

export const lateUploadPreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
