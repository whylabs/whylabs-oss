import { atom } from 'recoil';

interface DrawnMenuAtom {
  open: boolean;
  chart?: string;
  component?: string;
  isMissingDataPoint?: boolean;
}

const DEFAULT_DRAWN_MENU_TIMESTAMP = {
  open: false,
};

export const drawnMenuAtom = atom<DrawnMenuAtom>({
  key: 'DrawnMenuAtom',
  default: DEFAULT_DRAWN_MENU_TIMESTAMP,
});
