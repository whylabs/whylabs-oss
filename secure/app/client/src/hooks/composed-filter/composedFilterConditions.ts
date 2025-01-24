import { ComposedFilterOption } from './types';

export const GREATER_THAN_CONDITION = '>';
export const LESS_THAN_CONDITION = '<';

export const INCLUDES_CONDITION = 'includes';
export const EXCLUDES_CONDITION = 'excludes';

export type COMPOSED_FILTER_NUMBER_CONDITIONS_UNION = typeof GREATER_THAN_CONDITION | typeof LESS_THAN_CONDITION;

export const COMPOSED_FILTER_NUMBER_CONDITIONS: ComposedFilterOption[] = [
  {
    label: 'Greater than',
    value: GREATER_THAN_CONDITION,
  },
  {
    label: 'Less than',
    value: LESS_THAN_CONDITION,
  },
];

export const COMPOSED_FILTER_LIST_CONDITIONS: ComposedFilterOption[] = [
  {
    label: 'Includes',
    value: INCLUDES_CONDITION,
  },
  {
    label: 'Does not include',
    value: EXCLUDES_CONDITION,
  },
];

export type TraceTableCondition =
  | (typeof COMPOSED_FILTER_LIST_CONDITIONS)[number]['value']
  | (typeof COMPOSED_FILTER_NUMBER_CONDITIONS)[number]['value'];
