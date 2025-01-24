/* Generates an anomaly if the number of unique values for input features in a batch differs by more than 3 standard deviations from
 the counts for batches in a fixed time range.

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#standard-deviations
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#fixed-time-range
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns

# Required user updates

baseline.range (recommended to contain at least 4 batches to use stddev analyzer)

# Common user updates

config.factor
targetMatrix (column include/exclude)


# Programmatic updates

change monitor displayName to "Unique value count vs time range"
ideally: change baseline.range to however we set the default range in the monitor UI when user selects time range


# Christine notes

This is an alternative to the static profile one because it's not clear how the user can get the reference profile ID.

In the docs, the time range goes up to 2022-03-25T00:00Z  Is this timestamp included, or not??! The current
UI generates end dates like 2023-02-21T23:59:59.999Z. Anyway, this date is easily miss interpretable because it at most
includes 1 microsecond of the 25th.

Note UI custom monitor editor truncates dates so 2022-03-25T00:00Z would appear to cover the whole day even though it only covers
1 microsecond.

*/
import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Unique values count outlier detection (stddev) monitor with fixed time range baseline';
const displayName = 'Unique values count vs time range';
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
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness">unique value</SafeLink>{' '}
    count for any discrete input column in the target batch differs by more than <pre>factor</pre> standard deviations
    from the count in a fixed time range.
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

export const uniqueValuesStddevFixedTimeRangePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
