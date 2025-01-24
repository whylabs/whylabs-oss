import { encodeComposedFilter } from '~/hooks/composed-filter/composed-filter-utils';
import { GREATER_THAN_CONDITION, LESS_THAN_CONDITION } from '~server/util/composed-filters-utils';

type COMPOSED_FILTER_NUMBER_CONDITIONS_UNION = typeof GREATER_THAN_CONDITION | typeof LESS_THAN_CONDITION;

export const getPolicyIssuesFilter = (condition: COMPOSED_FILTER_NUMBER_CONDITIONS_UNION, value: string) => {
  return encodeComposedFilter([
    {
      dimension: 'policyIssues',
      condition,
      value,
    },
  ]);
};

export const readableTraceTagNameConverter = (tag: string): string => {
  return tag.replace('.score.', ' ').replace(/[._]/gm, ' ');
};
