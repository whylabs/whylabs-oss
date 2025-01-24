import { AssetCategory } from 'generated/graphql';
import { ReactNode } from 'react';

export type CategoryKeys = `${AssetCategory}`;

export type PageTexts<T> = {
  [key in CategoryKeys]: T;
};

export type TextRecord = Record<string, ReactNode>;

export type GetDisplayTextProps<T extends TextRecord> = {
  category: CategoryKeys;
  key: keyof T;
  texts: PageTexts<T>;
};
