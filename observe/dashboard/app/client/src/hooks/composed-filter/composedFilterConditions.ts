import { ALL_NUMBER_CONDITIONS, EXCLUDES_CONDITION, INCLUDES_CONDITION } from '~server/util/composed-filters-utils';

import { ComposedFilterOption } from './types';

export const COMPOSED_FILTER_NUMBER_CONDITIONS: ComposedFilterOption[] = ALL_NUMBER_CONDITIONS.map((condition) => ({
  label: condition,
  value: condition,
}));

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
