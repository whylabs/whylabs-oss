import { SafeLink } from '@whylabs/observatory-lib';
import { commonConfigurationSteps } from '../../../../components/CheckListCommonItems';
import { JsonPreset, PresetCheckList, ProgrammaticChange } from '../../../types';

const presetName = 'Response low relevance detection (stddev) monitor with trailing window baseline';
const displayName = 'Response low relevance detection';
const baseConfig = {
  schedule: {
    type: 'fixed',
    cadence: '$auto_fill_cadence',
  },
  targetMatrix: {
    type: 'column',
    include: ['response.similarity.prompt'],
    exclude: [],
    segments: [],
  },
  config: {
    metric: 'median',
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
    Generates an anomaly if the{' '}
    <SafeLink href="https://docs.whylabs.ai/docs/advanced-monitor-configuration/#median">median</SafeLink> count of
    response relevance in the target batch differs by more than <pre>factor</pre> standard deviations from the value in
    a trailing window.
  </>
);

const configurationSteps: JSX.Element[] = [
  commonConfigurationSteps.review_monitor_display_name_and_severity,
  commonConfigurationSteps.set_monitor_actions,
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

export const responseLowRelevancePreset: JsonPreset = {
  displayName,
  baseConfig,
  programmaticChanges,
  presetName,
  checkList,
};
