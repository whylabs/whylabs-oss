import { filter, pipe, sort, uniq } from 'ramda';

import { SortableValue, pageArray, sortAsc, sortDesc } from '../../util/misc';
import { LimitSpec, SortDirection } from '../generated/graphql';

export const withStandardSorter = (direction: SortDirection): ((a: SortableValue, b: SortableValue) => number) => {
  switch (direction) {
    case SortDirection.Asc:
      return sortAsc;
    case SortDirection.Desc:
      return sortDesc;
    default:
      throw Error(`Unknown sort direction: ${direction}`);
  }
};

export const withCaseInsensitiveStrFilter =
  (substr?: string | null) =>
  (item: string): boolean =>
    !substr || item.toLocaleLowerCase().includes(substr.toLocaleLowerCase());

/**
 * Makes the provided list of items unique, then applies the search filter to it before sorting/paginating the results
 * @param items Items to sort/filter
 * @param filterFunc Filter to apply to each item
 * @param sortFunc Sorting function to apply to each item
 * @param limitSpec Offset/limit
 */
export const makeUniqueAndFilter = <T extends number | string>(
  items: T[],
  filterFunc: (item: T) => boolean,
  sortFunc: (a: T, b: T) => number,
  limitSpec?: LimitSpec | null,
): T[] =>
  pipe(
    // we only want unique items here
    (items: T[]) => uniq(items),
    filter(filterFunc),
    sort<T>(sortFunc),
    (items) => pageArray(items, limitSpec?.offset ?? 0, limitSpec?.limit ?? 0),
  )(items);
