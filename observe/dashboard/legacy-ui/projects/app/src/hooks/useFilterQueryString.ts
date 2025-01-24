import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export enum FilterKeys {
  modelFilter = 'modelFilter',
  featureFilter = 'featureFilter',
  outputFilter = 'outputFilter',
  profileFilter = 'includeType',
  anomalyFilter = 'anomalyFilter',
  searchString = 'searchText',
  resourcesFilter = 'resourcesFilter',
  none = '',
}
export type FilterValues = `${FilterKeys}`;

interface FilterQueryStringReturn {
  addFiltersToQueryParams: (filters: string[]) => void;
  getFiltersFromQueryParams: () => string[];
}

export default function useFilterQueryString(filterKey: FilterKeys): FilterQueryStringReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const getFiltersFromQueryParams = useCallback((): string[] => {
    return searchParams.getAll(filterKey) ?? [];
  }, [filterKey, searchParams]);

  const addFiltersToQueryParams = useCallback(
    (checkedFilters: string[]) => {
      setSearchParams(
        (nextParams) => {
          nextParams.delete(filterKey);
          checkedFilters.forEach((filter) => nextParams.append(filterKey, filter));
          return nextParams;
        },
        { replace: true },
      );
    },
    [filterKey, setSearchParams],
  );

  return {
    addFiltersToQueryParams,
    getFiltersFromQueryParams,
  };
}
