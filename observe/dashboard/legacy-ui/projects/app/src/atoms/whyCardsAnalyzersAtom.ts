import { atom } from 'recoil';

type AnalyzersAtom = {
  [key in string]: string;
};
const initialState: AnalyzersAtom = {};

export const whyCardsAnalyzersAtom = atom<AnalyzersAtom>({
  key: 'WhyCardsAnalyzersState',
  default: initialState,
});
