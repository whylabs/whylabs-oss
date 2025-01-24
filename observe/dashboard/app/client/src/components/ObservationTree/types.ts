import { ReactNode } from 'react';

export type ObservationTreeItem = {
  id: string;
  parentId?: string | null;
  title: ReactNode;
};

export type NestedObservationTreeItem = ObservationTreeItem & {
  children?: NestedObservationTreeItem[];
};
