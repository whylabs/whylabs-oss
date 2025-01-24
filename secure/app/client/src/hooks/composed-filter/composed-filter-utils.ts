import { FiltersList } from '~server/trpc/util/composedFilterSchema';

export const encodeComposedFilter = (filter: FiltersList) => {
  try {
    if (isValidFilter(filter)) {
      return JSON.stringify(filter);
    }

    console.error('Failed to encode invalid composed filter', { filter });
  } catch (error) {
    console.error('Failed to encode composed filter', { error, filter });
  }
  return null;
};

const isValidFilter = (f: unknown): f is FiltersList => {
  if (!Array.isArray(f)) return false;

  return f.every((filter) => {
    if (typeof filter !== 'object') return false;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return Object.keys(filter).every(
      (key) => ['dimension', 'condition', 'value'].includes(key) && typeof filter[key] === 'string',
    );
  });
};
