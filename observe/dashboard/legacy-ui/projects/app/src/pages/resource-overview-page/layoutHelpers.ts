import { ModelOverviewInfoFragment } from 'generated/graphql';
import { ModelSortBy } from 'hooks/useSort/types';
import { SortReturn } from 'hooks/useSort/useSort';

export type ResourceOverviewData = {
  totalAnomaliesInRange: number;
} & ModelOverviewInfoFragment;

export type ModelSetSort = SortReturn<ModelSortBy>['setSort'];

export type LayoutType = 'table' | 'card';
export const DEFAULT_LAYOUT_TYPE: LayoutType = 'card';

export function isLayoutType(possible?: string | null): possible is LayoutType {
  return possible === 'table' || possible === 'card';
}

export function asLayoutType(possible: string | null | undefined, valueIfMissing: LayoutType): LayoutType {
  return isLayoutType(possible) ? possible : valueIfMissing;
}

export function asLayoutTypeOrDefault(possible: string | null | undefined): LayoutType {
  return asLayoutType(possible, DEFAULT_LAYOUT_TYPE);
}

export interface CardResourceCommonFieldProps {
  model: ModelOverviewInfoFragment;
}
export interface CardResourceSortableFieldProps extends CardResourceCommonFieldProps {
  fieldSortKey: ModelSortBy;
  appliedSortKey?: ModelSortBy;
  sortTooltip: React.ReactNode;
}
