import { FiltersList } from '~server/trpc/util/composedFilterSchema';
import LogRocket from 'logrocket';

export const encodeComposedFilter = (filter: FiltersList) => {
  try {
    if (isValidFilter(filter)) {
      return JSON.stringify(filter);
    }

    LogRocket.error('Failed to encode invalid composed filter', { filter });
  } catch (error) {
    LogRocket.error('Failed to encode composed filter', { error, filter });
  }
  return null;
};

const isValidFilter = (f: unknown): f is FiltersList => {
  if (!Array.isArray(f)) return false;

  return f.every((filter) => {
    if (typeof filter !== 'object') return false;

    return Object.keys(filter).every(
      (key) => ['dimension', 'condition', 'value'].includes(key) && typeof filter[key] === 'string',
    );
  });
};
