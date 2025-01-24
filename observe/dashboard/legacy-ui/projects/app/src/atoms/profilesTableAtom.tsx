import { atom } from 'recoil';

export const tableSelectedRowAtom = atom({
  key: 'TableSelectedRow',
  default: -1,
});
