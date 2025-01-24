/* Generates an anomaly if the missing value ratio for any feature in a batch differs by more than 50% of the number in a reference profile

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#schema-count-metrics
  https://docs.whylabs.ai/docs/advanced-monitor-configuration/#reference-profiles
    https://docs.whylabs.ai/docs/advanced-monitor-configuration/#percent
      https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns

# Required user updates
baseline.profileId

# Common user updates
config.threshold
targetMatrix (column include/exclude)


# Programmatic updates

change monitor displayName to "Missing values ratio vs ref profile"

# UI changes needed

UI editor does not support percentage change for data quality metrics. We'd either need to add that or add explicit checks to
prevent this being edited (without stopping the metrics where we do support percentage change, which I think is performance?)
I'm really not sure why we don't support this for data quality, given we do support percentage and absolute diff for performance.

                                                                                                                       There needs to be some way to get the reference profile ID.

# Christine notes

I went with percent because stddev is not a good measure relative to a single reference profile.

  The examples in the docs are applying the uniqueness test to continuous features - should be discrete ones.
  Also, the count example has fixed thresholds applied to all continuous features. Fixed thresholds would most likely
be applied to a specific feature; for multiple features - stddev or percentage would be a better choice.

*/
import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from '../../types';

const presetName = 'Missing values ratio percent monitor with static profile baseline';
const displayName = 'Missing values ratio vs ref profile';
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
    type: 'diff',
    mode: 'pct',
    threshold: 50,
    baseline: {
      type: 'Reference',
      profileId: REPLACE_REQUIRED_TOKEN,
    },
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the&nbsp;
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#schema-count-metrics">
      null count ratio
    </SafeLink>{' '}
    for any input column in the target batch differs by more than <pre>threshold</pre> percent of the ratio in a static
    reference profile.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.optionally_change_analyzer_target_matrix,
  commonConfigurationSteps.review_analyzer_config_threshold,
  commonConfigurationSteps.set_analyzer_baseline_profile_id,
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

export const missingValuesStaticProfilePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
