/* Generates an anomaly if the number of unique values for input features in a batch differs by more than 50% of the number in a reference profile

https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#reference-profiles
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#percent
https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns

# Required user updates

baseline.profileId

# Common user updates

config.threshold
targetMatrix (column include/exclude)


# Programmatic updates

change monitor displayName to "Unique value count vs ref profile"

# UI changes needed

See missing value example


# Christine notes

The examples in the docs are applying the uniqueness test to continuous features - should be discrete ones.
Also the count example has fixed thresholds applied to all continuous features. Fixed thresholds would most likely
 be applied to a specific feature; for multiple features - stddev or percentage would be a better choice.
*/
import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from '../../types';

const presetName = 'Unique values count percent monitor with static profile baseline';
const displayName = 'Unique values count vs ref profile';
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
      type: 'Reference',
      profileId: REPLACE_REQUIRED_TOKEN,
    },
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness">unique value</SafeLink>{' '}
    count for any discrete input column in the target batch differs by more than <pre>threshold</pre> percent of the
    count in a static reference profile.
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

export const uniqueValuesStaticProfilePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
