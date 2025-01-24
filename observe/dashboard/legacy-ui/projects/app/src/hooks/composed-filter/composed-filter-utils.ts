import { FiltersList } from './types';

export const encodeComposedFilter = (filter: FiltersList): string | null => {
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

    return Object.keys(filter).every(
      (key) => ['dimension', 'condition', 'value'].includes(key) && typeof filter[key] === 'string',
    );
  });
};
