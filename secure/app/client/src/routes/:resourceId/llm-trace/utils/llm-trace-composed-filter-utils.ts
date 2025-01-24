import { encodeComposedFilter } from '~/hooks/composed-filter/composed-filter-utils';
import { COMPOSED_FILTER_NUMBER_CONDITIONS_UNION } from '~/hooks/composed-filter/composedFilterConditions';

export const getPolicyIssuesFilter = (condition: COMPOSED_FILTER_NUMBER_CONDITIONS_UNION, value: string) => {
  return encodeComposedFilter([
    {
      dimension: 'policyIssues',
      condition,
      value,
    },
  ]);
};
