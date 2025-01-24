import { ReactNode } from 'react';
import { GetDisplayTextProps, TextRecord } from './types';

export function getDisplayText<T extends TextRecord>({ category, key, texts }: GetDisplayTextProps<T>): ReactNode {
  return texts[category]?.[key] ?? '';
}
