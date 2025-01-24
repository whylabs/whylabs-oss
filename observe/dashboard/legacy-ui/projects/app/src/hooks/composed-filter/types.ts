export type ComposedFilterOption = {
  label: string;
  value: string;
};

export type ComposedFilterDimension = ComposedFilterOption & {
  disabled?: boolean;
  disableCondition?: boolean;
  disableValue?: boolean;
  disabledTooltip?: string;
  type: 'string' | 'number' | 'list';
};

export type ComposedFilter = {
  condition: string | null;
  dimension: string | null;
  selectedDimension: ComposedFilterDimension | null;
  shouldChooseCondition: boolean;
  shouldDisableValueByLackOfCondition: boolean;
  notApplicableValue?: boolean;
  hideConditionSelection?: boolean;
  value: string | null;
};

export type FiltersList = Array<{
  condition?: string | null;
  dimension?: string | null;
  value?: string | null;
}>;

export type ReadyToQueryFilter = {
  condition?: string | null;
  dimension: string;
  index: number;
  value: string;
};

// Number filter conditions
export const EQUAL_CONDITION = '=';
export const GREATER_THAN_CONDITION = '>';
export const GREATER_THAN_OR_EQUAL_CONDITION = '>=';
export const LESS_THAN_CONDITION = '<';
export const LESS_THAN_OR_EQUAL_CONDITION = '<=';

export const ALL_NUMBER_CONDITIONS = [
  EQUAL_CONDITION,
  GREATER_THAN_CONDITION,
  GREATER_THAN_OR_EQUAL_CONDITION,
  LESS_THAN_CONDITION,
  LESS_THAN_OR_EQUAL_CONDITION,
] as const;
// List filter conditions
export const INCLUDES_CONDITION = 'includes';
export const EXCLUDES_CONDITION = 'excludes';
