/* Generates an anomaly if the ratio of missing values for any feature in a batch differs by more than 3 standard deviations from
 the ratio for batches in a fixed time range.

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#schema-count-metrics
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#standard-deviations
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#fixed-time-range
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns

# Required user updates

baseline.range (recommended to contain at least 4 batches to use stddev analyzer)

# Common user updates

config.factor
targetMatrix (column include/exclude)


# Programmatic updates

change monitor displayName to "Missing value ratio vs time range"
ideally: change baseline.range to however we set the default range in the monitor UI when user selects time range



# Christine notes

I went with stddev because it should be less noisy/arbitrary than percent when used on multiple features and dealing
with a range of profiles (as long as there are 4 or more).

*/
import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Missing values ratio outlier detection (stddev) monitor with fixed time range baseline';
const displayName = 'Missing values ratio vs time range';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: ['group:input'],
    exclude: [],
    segments: [],
  },
  config: {
    metric: 'count_null_ratio',
    type: 'stddev',
    factor: 3.0,
    baseline: {
      type: 'TimeRange',
      range: {
        // TODO improve this to programmatically fill
        start: '2023-01-05T00:00:00.000Z',
        end: '2023-02-04T23:59:59.999Z',
      },
    },
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#schema-count-metrics">
      null count ratio
    </SafeLink>{' '}
    for any input column in the target batch differs by more than <pre>factor</pre> standard deviations from the ratio
    in a fixed time range.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.optionally_change_analyzer_target_matrix,
  commonConfigurationSteps.update_analyzer_baseline_range,
  commonConfigurationSteps.review_analyzer_config_factor,
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

export const missingValuesStddevFixedTimeRangePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
