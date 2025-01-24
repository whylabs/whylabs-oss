import { SortByKeys, SortDirection, SortDirectionKeys, SortDirectionType } from '~/types/sortTypes';
import { SORT_BY_QUERY_NAME, SORT_DIRECTION_QUERY_NAME } from '~/utils/searchParamsConstants';
import { useCallback } from 'react';

import { useMainStackCustomEventsEmitters } from './useMainStackCustomEventsEmitters';
import { SetSearchParamsFn, useSearchAndHashParams } from './useSearchAndHashParams';

type UseSortProps<T extends string | undefined> = {
  defaultSortBy?: T;
  defaultSortDirection?: SortDirection;
  shouldEmitEventToMainStack?: boolean;
  customSortState?: {
    value: URLSearchParams;
    setter: SetSearchParamsFn;
  };
  sortByKey?: SortByKeys;
  sortDirectionKey?: SortDirectionKeys;
};

export interface UseSortReturn<T extends string | undefined> {
  sortBy: T | undefined;
  sortDirection: SortDirectionType;
  setSort(newSortBy: T | null, newSortDir: SortDirectionType): void;
}

export default function useSort<T extends string | undefined>(props?: UseSortProps<T>): UseSortReturn<T> {
  const [searchParams, setSearchParams] = useSearchAndHashParams();
  const usedParamsState = props?.customSortState?.value || searchParams;
  const usedParamsSetter = props?.customSortState?.setter || setSearchParams;
  const { sortByKey = SORT_BY_QUERY_NAME, sortDirectionKey = SORT_DIRECTION_QUERY_NAME } = props ?? {};

  const { setSearchParams: mainStackSetParams } = useMainStackCustomEventsEmitters();

  const sortByParam = usedParamsState.get(sortByKey) as T;
  const sortDirectionParam = usedParamsState.get(sortDirectionKey);

  const sortDirection: SortDirectionType = isValidSortDirection(sortDirectionParam) ? sortDirectionParam : undefined;

  const setSort = useCallback(
    (newSortBy: T | null, newSortDir: SortDirectionType) => {
      usedParamsSetter((nextSearchParams) => {
        const newState = new URLSearchParams(nextSearchParams);
        if (newSortDir) {
          newState.set(sortByKey, newSortBy ?? '');
          newState.set(sortDirectionKey, newSortDir);
        } else {
          newState.delete(sortByKey);
          newState.delete(sortDirectionKey);
        }

        if (props?.shouldEmitEventToMainStack) {
          mainStackSetParams(newState.toString());
        }

        return newState;
      });
    },
    [mainStackSetParams, props?.shouldEmitEventToMainStack, sortByKey, sortDirectionKey, usedParamsSetter],
  );

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
