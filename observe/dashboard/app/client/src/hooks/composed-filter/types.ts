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
