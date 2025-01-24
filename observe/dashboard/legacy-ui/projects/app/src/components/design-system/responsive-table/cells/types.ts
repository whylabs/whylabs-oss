import { SortDirectionType, SortType } from 'hooks/useSort/types';

export interface GenericCellProps {
  readonly children: React.ReactNode;
  tooltipText?: string;
  className?: string;
}

export type SortableGenericCellProps = Pick<GenericCellProps, 'className' | 'children' | 'tooltipText'> & {
  sortDirection: SortDirectionType;
  sortType?: SortType;
  onSortDirectionChange: (sortDirection: SortDirectionType) => void;
  background?: { default?: string; onHover?: string };
};
