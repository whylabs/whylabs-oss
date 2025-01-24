import { SortDirection } from 'generated/graphql';

export type SortDirectionType = SortDirection | undefined;
export type SortType = 'number' | 'text';

export enum SortByKeys {
  sortModelBy = 'sortModelBy',
  sortInputsBy = 'sortInputsBy',
  sortAnomaliesBy = 'sortAnomaliesBy',
  sortSegmentsBy = 'sortSegmentsBy',
  sortActionsBy = 'sortActionsBy',
}
export enum SortDirectionKeys {
  sortModelDirection = 'sortModelDirection',
  sortInputsDirection = 'sortInputsDirection',
  sortAnomaliesDirection = 'sortAnomaliesDirection',
  sortSegmentsDirection = 'sortSegmentsDirection',
  sortActionsDirection = 'sortActionsDirection',
}

export type ModelSortBy =
  | 'LatestAlert'
  | 'Name'
  | 'AnomaliesInRange'
  | 'Volume'
  | 'Freshness'
  | 'ResourceType'
  | 'CreationTime';
export type AnomalySortType = 'timestamp';

export type AllAccessors<T> = (keyof T | string)[];
