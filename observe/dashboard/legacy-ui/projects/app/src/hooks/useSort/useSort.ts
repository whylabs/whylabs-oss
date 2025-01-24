import { useState, useCallback } from 'react';
import { SortDirection } from 'generated/graphql';
import { useLocation, useNavigate } from 'react-router-dom';
import qs from 'query-string';
import { SortDirectionType, SortByKeys, SortDirectionKeys, AllAccessors } from 'hooks/useSort/types';
import { JSONValue } from 'types/genericTypes';
import sortByType from './sort-by/genericSorting';

export interface SortReturn<SortBy extends string | undefined> {
  handleSort: <DataT extends Exclude<JSONValue, undefined>>(
    data: DataT[],
    nextSortDirection: SortDirectionType,
    newSortBy: SortBy,
    accessors?: AllAccessors<DataT>,
  ) => DataT[];
  sortBy: SortBy | undefined;
  sortDirection: SortDirectionType;
  /** Intended to be used in queries, and should only be updated via setSortQuery. */
  sortByCommitted: SortBy | undefined;
  /** Intended to be used in queries, and should only be updated via setSortQuery.  */
  sortDirectionCommitted: SortDirectionType;
  /** Updates local sort state  */
  setSort(newSortBy: SortBy | undefined, newSortDir: SortDirectionType, setQueryString?: boolean): void;
  /** Updates query sort state  */
  setSortQuery: (newSortBy: SortBy | undefined, newSortDir: SortDirectionType) => void;
}

export default function useSort<SortBy extends string | undefined>(
  sortByKey: SortByKeys,
  sortDirectionKey: SortDirectionKeys,
): SortReturn<SortBy> {
  const { search } = useLocation();
  const navigate = useNavigate();

  const { sortByValue: initialSortByValue, sortDirectionValue: initialSortDirectionValue } = getInitialValues();

  // TODO: try to remove these states after migrating to react-router version 6, the URL should be the source of truth
  const [sortDirection, setSortDirection] = useState<SortDirectionType>(initialSortDirectionValue);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortByValue);
  const [sortDirectionForQuery, setSortDirectionForQuery] = useState<SortDirectionType>(initialSortDirectionValue);
  const [sortByForQuery, setSortByForQuery] = useState<SortBy | undefined>(initialSortByValue);

  /**
   * Sets pair of sort states which are responsible for local sided logic.
   */
  const setSort = useCallback(
    (newSortBy: SortBy, newSortDir: SortDirectionType, setQueryString = true) => {
      if (sortBy === newSortBy && sortDirection === newSortDir) return;
      setSortBy(newSortBy);
      setSortDirection(newSortDir);
      if (setQueryString) {
        const queryParams = qs.parse(search);

        // Avoid unnecessary history replace that causes infinite loop
        if (newSortBy !== queryParams[sortByKey] || newSortDir !== queryParams[sortDirectionKey]) {
          queryParams[sortByKey] = newSortDir === undefined ? undefined : newSortBy; // If we dont have sort direction we dont need sort by
          queryParams[sortDirectionKey] = newSortDir;

          navigate(`?${qs.stringify(queryParams)}`, { replace: true });
        }
      }
    },
    [navigate, search, sortBy, sortByKey, sortDirection, sortDirectionKey],
  );

  const handleSort = useCallback(
    <DataT extends Exclude<JSONValue, undefined>>(
      data: DataT[],
      nextSortDirection: SortDirectionType,
      newSortBy: SortBy,
      accessors: AllAccessors<DataT> = [],
    ): DataT[] => {
      setSort(newSortBy, nextSortDirection);
      if (!nextSortDirection) {
        return data;
      }
      return sortByType<DataT>(data ?? [], nextSortDirection, accessors);
    },
    [setSort],
  );

  /**
   * Sets pair of query sort states which are responsible for triggering queries.
   */
  const setSortQuery = useCallback((newSortBy: SortBy | undefined, newSortDir: SortDirectionType) => {
    setSortDirectionForQuery(newSortDir);
    setSortByForQuery(newSortBy);
  }, []);

  function assertSortDirection(paramSortDir: string | undefined): SortDirectionType {
    if (paramSortDir && isValueInSortDirection(paramSortDir)) return paramSortDir;

    return undefined;
  }

  return {
    handleSort,
    sortBy,
    sortDirection,
    setSort,
    sortByCommitted: sortByForQuery,
    sortDirectionCommitted: sortDirectionForQuery,
    setSortQuery,
  };

  function getInitialValues() {
    const queryParams = qs.parse(search);
    const paramSortDirection = getValue(queryParams, sortDirectionKey);
    const paramSortBy = getValue(queryParams, sortByKey);
    const sortByValue = paramSortBy as SortBy;
    const sortDirectionValue = assertSortDirection(paramSortDirection);

    return { sortByValue, sortDirectionValue };
  }
}

function getValue(queryParams: qs.ParsedQuery<string>, tag: string): string | undefined {
  const value = queryParams[tag];
  if (typeof value === 'string') return value;

  return undefined;
}

function isValueInSortDirection(value: string): value is SortDirection {
  return Object.values(SortDirection).includes(value as SortDirection);
}
