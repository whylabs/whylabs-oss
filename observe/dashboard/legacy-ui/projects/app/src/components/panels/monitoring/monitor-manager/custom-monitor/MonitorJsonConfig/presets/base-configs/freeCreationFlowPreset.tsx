import { JsonPreset, PresetCheckList, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from '../types';
import { commonConfigurationSteps } from '../../components/CheckListCommonItems';
import { genericMonitorPreset } from './monitorPreset';

export const emptyMonitorPreset: JsonPreset = {
  presetName: '',
  baseConfig: genericMonitorPreset.baseConfig,
  programmaticChanges: ['$auto_fill_dataset_timestamp_offset'],
};

const baseAnalyzerConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: REPLACE_REQUIRED_TOKEN,
  },
  config: {
    type: REPLACE_REQUIRED_TOKEN,
    metric: REPLACE_REQUIRED_TOKEN,
    baseline: {
      type: 'TrailingWindow',
      size: 7,
    },
  },
};

const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>Generates an anomaly based on the custom configuration that is built from an initial empty JSON configuration</>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.set_analyzer_target_matrix_type,
  commonConfigurationSteps.if_targeting_columns,
  commonConfigurationSteps.set_config_type,
  commonConfigurationSteps.set_config_metric_and_others,
  commonConfigurationSteps.update_baseline,
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

export const emptyAnalyzerPreset: JsonPreset = {
  presetName: 'Custom JSON from empty state',
  baseConfig: baseAnalyzerConfig,
  programmaticChanges,
  checkList,
};
