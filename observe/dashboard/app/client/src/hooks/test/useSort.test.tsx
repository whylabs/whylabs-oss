import { act, renderHook } from '@testing-library/react';
import { SortDirection } from '~/types/sortTypes';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import useSort from '../useSort';

describe('useSort()', () => {
  it('should return default values', () => {
    const { result } = getHookRenderer();

    expect(result.current).toStrictEqual({
      sortBy: undefined,
      sortDirection: undefined,
      setSort: expect.any(Function),
    });
  });

  it.each([
    ['name', 'ASC'],
    ['name', 'DESC'],
    ['createdAt', 'ASC'],
  ])('should return sortBy %p and sortDirection %p from url params', (sortBy, sortDirection) => {
    const { result } = getHookRenderer({
      initialEntries: [`/test?sortBy=${sortBy}&sortDirection=${sortDirection}`],
    });

    expect(result.current).toStrictEqual({
      sortBy,
      sortDirection,
      setSort: expect.any(Function),
    });
  });

  it('should update sort parameters', () => {
    const { result } = getHookRenderer({ initialEntries: ['/test?sortBy=name&sortDirection=ASC'] });

    act(() => {
      result.current.setSort('createdAt', SortDirection.Desc);
    });

    expect(result.current.sortBy).toBe('createdAt');
    expect(result.current.sortDirection).toBe(SortDirection.Desc);
  });
});

// Helpers
function getHookRenderer({
  initialEntries,
}: {
  initialEntries?: string[];
} = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );

  return renderHook(() => useSort(), { wrapper });
}
