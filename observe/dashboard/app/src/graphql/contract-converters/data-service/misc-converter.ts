import { SortOrder } from '@whylabs/data-service-node-client';

import { SortDirection } from '../../generated/graphql';

export const gqlToSortOrder = (direction?: SortDirection): SortOrder => {
  if (direction === SortDirection.Desc) return SortOrder.Desc;
  return SortOrder.Asc;
};
