export type ComposedFilterOption = {
  label: string;
  value: string;
};

export type ComposedFilterDimension = ComposedFilterOption & {
  disabled?: boolean;
  disabledTooltip?: string;
  type: 'string' | 'number' | 'list';
};

export type ComposedFilter = {
  condition: string | null;
  dimension: string | null;
  conditionOptions: ComposedFilterOption[];
  selectedDimension: ComposedFilterDimension | null;
  shouldChooseCondition: boolean;
  shouldDisableValueByLackOfCondition: boolean;
  value: string | null;
};
