import { atom } from 'recoil';
import { EmptyObject } from 'types/genericTypes';

export interface GenericEditorLineInfo {
  textContent: string;
  type: 'error' | 'warning' | 'info';
}
export type GenericEditorLineInfoType = GenericEditorLineInfo | EmptyObject;
type GenericEditorLines = {
  [uniqueKey: string]: GenericEditorLineInfoType[];
};

/*
 * This Recoil state is used to handle inline validations on GenericCodeEditor.
 * Should be used with a custom Hook e.g. useCustomMonitorJsonHandler.
 * */
export const genericEditorLinesAtom = atom<GenericEditorLines>({
  key: 'GenericEditorLinesAtom',
  default: {},
});
