import { atom } from 'recoil';

export type GraphType = 'uniqueValues' | 'missingValues';
export interface ManualThresholdInputProps {
  focused: boolean;
  thresholdMax: number;
  thresholdMin: number;
  graphType: GraphType;
}

const DEFAULT_MANUAL_THRESHOLD_INPUT_STATE: ManualThresholdInputProps = {
  focused: false,
  thresholdMax: 0,
  thresholdMin: 0,
  graphType: 'uniqueValues',
};

export const manualThresholdInputAtom = atom({
  key: 'ManualThresholdInput',
  default: DEFAULT_MANUAL_THRESHOLD_INPUT_STATE,
});
