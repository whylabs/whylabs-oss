import { atom } from 'recoil';

interface HoverAtom {
  active: boolean;
  chart: string;
  component: string;
  timestamp: number | undefined;
}

const DEFAULT_HOVER_TIMESTAMP = {
  active: false,
  chart: '',
  component: '',
  timestamp: undefined,
};

export const hoverAtom = atom<HoverAtom>({
  key: 'HoverAtom',
  default: DEFAULT_HOVER_TIMESTAMP,
});
