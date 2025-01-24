import { act, renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/react/utils';
import { ReactNode } from 'react';

import { selectedIdsAtom, useSelectedIds } from './useSelectedIds';

describe('useSelectedIds()', () => {
  it('should return default values', () => {
    const { result } = getHookRenderer();

    expect(result.current).toStrictEqual({
      resetSelectedIds: expect.any(Function),
      selectedIds: [],
      setSelectedIds: expect.any(Function),
    });
  });

  it('should return last selected list', () => {
    const id1 = '1111';
    const id2 = '2222';
    const id3 = '3333';

    const { result } = getHookRenderer();

    act(() => {
      result.current.setSelectedIds([id1, id3]);
    });
    expect(result.current.selectedIds).toStrictEqual([id1, id3]);

    act(() => {
      result.current.setSelectedIds([id3, id2]);
    });
    expect(result.current.selectedIds).toStrictEqual([id3, id2]);

    act(() => {
      result.current.setSelectedIds([]);
    });
    expect(result.current.selectedIds).toStrictEqual([]);
  });

  it.each([[['abc', 'bca']], [['lorem', 'ipsum']]])('should return selectedIds %p from hash params', (list) => {
    const { result } = getHookRenderer(list);
    expect(result.current.selectedIds).toStrictEqual(list);
  });

  it('should reset selectedIds', () => {
    const { result } = getHookRenderer(['abc', 'bca']);

    act(() => {
      result.current.resetSelectedIds();
    });
    expect(result.current.selectedIds).toStrictEqual([]);
  });
});

// Helpers
function getHookRenderer(initialValue: string[] = []) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider>
      <TestComponent initialValue={initialValue}>{children}</TestComponent>
    </Provider>
  );

  return renderHook(() => useSelectedIds(), { wrapper });
}

const TestComponent = ({ children, initialValue }: { children: ReactNode; initialValue: string[] }) => {
  useHydrateAtoms([[selectedIdsAtom, initialValue]]);
  return <>{children}</>;
};
