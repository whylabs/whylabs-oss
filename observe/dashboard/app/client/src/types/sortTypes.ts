import { SortDirection } from '~server/graphql/generated/graphql';

export { SortDirection };
export type SortDirectionType = SortDirection | undefined;
export type SortType = 'number' | 'text';

export enum SortByKeys {
  sortResourcesBy = 'sortResourcesBy',
  sortDashboardsBy = 'sortDashboardsBy',
  sortTracesBy = 'sortBy', // keeping previous keys for traces to avoid breaking saved urls
  sortActionsBy = 'sortActionsBy',
  sortApiKeysBy = 'sortApiKeysBy',
}
export enum SortDirectionKeys {
  sortResourcesDirection = 'sortResourcesDirection',
  sortDashboardsDirection = 'sortDashboardsDirection',
  sortTracesDirection = 'sortDirection', // keeping previous keys for traces to avoid breaking saved urls
  sortActionsDirection = 'sortActionsDirection',
  sortApiKeysDirection = 'sortApiKeysDirection',
}

export type SortByValues = `${SortByKeys}`;
export type SortDirectionValues = `${SortDirectionKeys}`;

export type AllAccessors<T> = (keyof T | string)[];
