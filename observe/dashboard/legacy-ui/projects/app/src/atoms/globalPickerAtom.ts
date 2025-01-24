import { atom } from 'recoil';
import { TimePeriod } from 'generated/graphql';
import { GLOBAL_PICKER_ID } from 'constants/hardcoded';

export interface SuperDatePickerState {
  [key: string]: {
    timePeriod: TimePeriod;
  };
}

export const SuperDatePickerAtom = atom<SuperDatePickerState>({
  key: 'superDatePickerAtom',
  default: {
    [GLOBAL_PICKER_ID]: { timePeriod: TimePeriod.P1D },
  },
});
