import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../../types';

const presetName = 'Prompt data leakage monitor';
const displayName = 'Prompt data leakage';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: [
      'prompt.pii.us_bank_number',
      'prompt.pii.email_address',
      'prompt.pii.phone_number',
      'prompt.pii.credit_card',
      'prompt.pii.us_ssn',
    ],
    exclude: [],
    segments: [],
  },
  config: {
    metric: 'unique_est',
    type: 'fixed',
    upper: 0,
  },
};
const programmaticChanges: ProgrammaticChange[] = ['$auto_fill_cadence'];

const description: JSX.Element = (
  <>
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#uniqueness">unique value</SafeLink>{' '}
    count of <pre>prompt.has_patterns</pre> is greater than zero.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
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

export const promptDataLeakageFixedPreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
