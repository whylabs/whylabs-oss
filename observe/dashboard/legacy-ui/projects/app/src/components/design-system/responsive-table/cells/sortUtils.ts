import { SortDirection } from 'generated/graphql';
import { SortDirectionType, SortType } from 'hooks/useSort/types';

export function getNextSortDirectionState(sortDirection: SortDirectionType, sortType?: SortType): SortDirectionType {
  // For numbers the sort order is: Desc -> Asc -> undefined -> Desc
  if (sortType === 'number') {
    switch (sortDirection) {
      case undefined:
        return SortDirection.Desc;
      case SortDirection.Desc:
        return SortDirection.Asc;
      case SortDirection.Asc:
      default:
        return undefined;
    }
  }

  // Default sort order: Asc -> Desc -> undefined -> Asc
  switch (sortDirection) {
    case undefined:
      return SortDirection.Asc;
    case SortDirection.Asc:
      return SortDirection.Desc;
    case SortDirection.Desc:
    default:
      return undefined;
  }
}
