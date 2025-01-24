import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { UseSearchParamListStateProps, useSearchParamListState } from '../useSearchParamListState';

const QUERY_NAME = 'aList';

describe('useSearchParamListState()', () => {
  it('should return empty list', () => {
    const { result } = getHookRenderer({ initialEntry: '/something' });

    expect(result.current.getList()).toStrictEqual([]);
  });

  it('should add an empty item when initializing with an empty list', () => {
    const emptyItem = getItem();

    const { result } = getHookRenderer({ initialEntry: '/something', mustHaveEmptyObject: emptyItem });
    expect(result.current.getList()).toStrictEqual([emptyItem]);
  });

  it('should return initial list', () => {
    const initialList = [
      getItem({
        id: '44ab3e1e',
        text: 'Something',
      }),
      getItem({
        id: '47ce5fed1581',
        text: 'Other',
      }),
    ];
    const { result } = getHookRenderer({ initialEntry: '/something', initialList });
    expect(result.current.getList()).toStrictEqual(initialList);
  });

  it('should ignore initialList when there is already a list in the URL', () => {
    const { result } = getHookRenderer({
      initialEntry: `/something?${QUERY_NAME}=%7B%22id%22%3A%22b123a23f%22%2C%22active%22%3Afalse%2C%22text%22%3A%22%22%7D`,
      initialList: [getItem({ id: 'ignored-one' })],
    });
    expect(result.current.getList()).toStrictEqual([
      {
        id: 'b123a23f',
        active: false,
        text: '',
      },
    ]);
  });

  it.each(['list', 'items'])('should use custom paramKey %p', (paramKey) => {
    const { result } = getHookRenderer({
      initialEntry: `/something?${paramKey}=%7B%22id%22%3A%22b123a23f%22%7D`,
      paramKey,
    });
    expect(result.current.getList()).toStrictEqual([{ id: 'b123a23f' }]);
  });

  it('should add an empty item', () => {
    const { result } = getHookRenderer({ initialEntry: '/something' });

    act(() => {
      result.current.setItem(getItem());
    });

    expect(result.current.getList()).toStrictEqual([getItem()]);
  });

  it.each([
    {
      id: '55ab3e1d',
      active: true,
      text: 'Something',
    },
    {
      id: '47ce5fed14e0',
      active: false,
      text: 'Other',
      someNumber: 5,
    },
  ])('should add a custom item %p', (itemToAdd) => {
    const { result } = getHookRenderer({ initialEntry: '/something' });

    act(() => {
      result.current.setItem(itemToAdd);
    });

    expect(result.current.getList()).toStrictEqual([itemToAdd]);
  });

  it('should add two items', () => {
    const item1 = getItem({
      id: '44ab3e1e',
      active: true,
      text: 'Something',
    });

    const item2 = getItem({
      id: '47ce5fed1581',
      text: 'Other',
      someNumber: 3,
    });

    const { result } = getHookRenderer({ initialEntry: '/something' });
    act(() => {
      result.current.setItem(item1);
      result.current.setItem(item2);
    });

    expect(result.current.getList()).toStrictEqual([item1, item2]);
  });

  it('should delete items', () => {
    const item1 = getItem({
      id: '44ab3e1e',
      active: true,
      text: 'Something',
    });

    const item2 = getItem({
      id: '47ce5fed1581',
      text: 'Other',
      someNumber: 3,
    });

    const { result } = getHookRenderer({ initialEntry: '/something' });
    act(() => {
      result.current.setItem(item1);
      result.current.setItem(item2);
    });

    act(() => {
      result.current.deleteItem(item1);
    });
    expect(result.current.getList()).toStrictEqual([item2]);

    act(() => {
      result.current.deleteItem(item2);
    });
    expect(result.current.getList()).toStrictEqual([]);
  });

  it('should add an empty item when deleting the last one', () => {
    const item1 = getItem({
      id: '44ab3e1e',
      active: true,
      text: 'Something',
    });

    const emptyItem = getItem();

    const { result } = getHookRenderer({ initialEntry: '/something', mustHaveEmptyObject: emptyItem });
    act(() => {
      result.current.setItem(item1);
    });

    act(() => {
      result.current.deleteItem(item1);
    });
    expect(result.current.getList()).toStrictEqual([emptyItem]);
  });

  it('should update the item', () => {
    const item = getItem({
      id: 'b123a23f',
    });
    const { result } = getHookRenderer({ initialEntry: '/something' });

    act(() => {
      result.current.setItem(item);
    });

    const updatedItem = {
      ...item,
      text: 'Updated',
      someNumber: 1,
    };
    act(() => {
      result.current.updateItem(updatedItem);
    });
    expect(result.current.getList()).toStrictEqual([updatedItem]);
  });
});

// Helpers
type TestType = {
  id: string;
  active: boolean;
  text: string;
  someNumber?: number;
};

function getHookRenderer({
  initialEntry = '/',
  paramKey = QUERY_NAME,
  ...rest
}: Partial<UseSearchParamListStateProps<TestType>> & {
  initialEntry?: string;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );

  return renderHook(() => useSearchParamListState<TestType>({ paramKey, ...rest }), { wrapper });
}

function getItem(custom: Partial<TestType> = {}): TestType {
  return {
    id: '',
    active: false,
    text: '',
    ...custom,
  };
}
