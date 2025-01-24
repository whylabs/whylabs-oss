/* Generates an anomaly if the number of unique values for input features in the target batch differs by more than 50% of the number in a trailing window

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#trailing-windows
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#percent
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns

# Required user updates

None
# Common user updates

config.threshold
targetMatrix (column include/exclude)
baseline.size


# Programmatic updates

change monitor displayName to "Unique value percent diff"
change baseline.size based on the batch frequency, as for current presets
*/
import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Unique values count percent monitor with trailing window baseline';
const displayName = 'Unique values percent diff';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: ['group:discrete'],
    exclude: ['group:output'],
    segments: [],
  },
  config: {
    metric: 'unique_est',
    type: 'diff',
    mode: 'pct',
    threshold: 50,
    baseline: {
      type: 'TrailingWindow',
      size: '$auto_fill_trailing_window_size',
    },
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence', '$auto_fill_trailing_window_size'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness">unique value</SafeLink>{' '}
    count for any discrete input column in the target batch differs by more than <pre>threshold</pre> percent of the
    count in a trailing window.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.optionally_change_analyzer_target_matrix,
  commonConfigurationSteps.review_analyzer_config_threshold,
  commonConfigurationSteps.review_trailing_window_size,
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

export const uniqueValuesTrailingWindowPreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
