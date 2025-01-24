/* Generates an anomaly if no profile is received for a given batch within a period of `dataReadinessDuration` after the end of the batch.

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#missing-data


# Required user updates
None

# Common user updates
dataReadinessDuration

# Programmatic updates
change monitor displayName to "Missing data monitor"

# Christine notes

As for late upload re segments.
The docs had a dataReadinessDuration of 1 day and 18 hours, but I went with 1 day.
I'm curious about how to handle daily data where there's no uploads expected over the weekend but you want to be
informed promptly of missing data during the week!

*/
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Missing profile monitor';
const displayName = 'Missing profile monitor';
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
    metric: 'missingDatapoint',
    type: 'fixed',
    upper: 0,
  },
  dataReadinessDuration: 'P1D',
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if no profile is received for a given batch within a period of <pre>dataReadinessDuration</pre>{' '}
    after the end of the batch.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.review_analyzer_data_readiness_duration,
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

export const missingProfilePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
