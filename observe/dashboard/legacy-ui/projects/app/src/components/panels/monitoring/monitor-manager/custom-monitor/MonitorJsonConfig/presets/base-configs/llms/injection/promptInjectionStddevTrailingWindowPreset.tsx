import { commonConfigurationSteps } from '../../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../../types';

const presetName = 'Prompt injection detection (stddev) monitor with trailing window baseline';
const displayName = 'Prompt injection detection';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: ['prompt.similarity.injection'],
    exclude: ['group:output'],
    segments: [],
  },
  config: {
    metric: 'quantile_99',
    type: 'stddev',
    factor: 2,
    baseline: {
      type: 'TrailingWindow',
      size: '$auto_fill_trailing_window_size',
    },
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence', '$auto_fill_trailing_window_size'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the 99th percentile of <pre>prompt.similarity.injection</pre> in the target batch differs by
    more than <pre>factor</pre> standard deviations from the value in a trailing window.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.review_trailing_window_size,
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

export const promptInjectionStddevTrailingPreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
