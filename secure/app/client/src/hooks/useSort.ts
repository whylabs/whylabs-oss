import { SortDirection, SortDirectionType } from '~/types/sortTypes';
import { SORT_BY_QUERY_NAME, SORT_DIRECTION_QUERY_NAME } from '~/utils/searchParamsConstants';

import { useSearchAndHashParams } from './useSearchAndHashParams';

type UseSortProps<T extends string | undefined> = {
  defaultSortBy?: T;
  defaultSortDirection?: SortDirection;
};

export interface UseSortReturn<T extends string | undefined> {
  sortBy: T | undefined;
  sortDirection: SortDirectionType;
  setSort(newSortBy: T | null, newSortDir: SortDirectionType): void;
}

export default function useSort<T extends string | undefined>(props?: UseSortProps<T>): UseSortReturn<T> {
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  const sortByParam = searchParams.get(SORT_BY_QUERY_NAME) as T;
  const sortDirectionParam = searchParams.get(SORT_DIRECTION_QUERY_NAME);

  const sortDirection: SortDirectionType = isValidSortDirection(sortDirectionParam) ? sortDirectionParam : undefined;

  function setSort(newSortBy: T | null, newSortDir: SortDirectionType) {
    setSearchParams((nextSearchParams) => {
      if (newSortDir) {
        nextSearchParams.set(SORT_BY_QUERY_NAME, newSortBy ?? '');
        nextSearchParams.set(SORT_DIRECTION_QUERY_NAME, newSortDir);
      } else {
        nextSearchParams.delete(SORT_BY_QUERY_NAME);
        nextSearchParams.delete(SORT_DIRECTION_QUERY_NAME);
      }

      return nextSearchParams;
    });
  }

  return {
    sortBy: sortByParam || props?.defaultSortBy,
    sortDirection: sortDirection || props?.defaultSortDirection,
    setSort,
  };
}

function isValidSortDirection(toTest: string | null): toTest is SortDirection {
  if (!toTest) return false;
  return Object.values(SortDirection).includes(toTest as SortDirection);
}
