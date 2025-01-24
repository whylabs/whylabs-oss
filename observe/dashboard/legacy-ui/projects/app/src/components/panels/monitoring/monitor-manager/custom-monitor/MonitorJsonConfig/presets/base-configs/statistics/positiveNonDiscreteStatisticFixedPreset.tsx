import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../types';

const presetName = 'Non-discrete positive number monitor';
const displayName = 'Non-discrete positive number monitor';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: ['group:continuous'],
    exclude: [],
    segments: [],
  },
  config: {
    metric: 'min',
    type: 'fixed',
    lower: 0,
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#minmax">minimum value</SafeLink> of any
    non-discrete column is negative.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
  commonConfigurationSteps.optionally_change_analyzer_target_matrix,
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

export const positiveNonDiscreteStatisticFixedPreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
