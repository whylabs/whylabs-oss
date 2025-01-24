import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { ComposedFilterDimension } from './types';
import { UseComposedFilterSearchParamProps, useComposedFilter } from './useComposedFilter';

jest.mock('lodash', () => {
  const module = jest.requireActual('lodash');
  module.debounce = jest.fn((fn) => fn);
  return module;
});

const STRING_DIMENSION: ComposedFilterDimension = {
  label: 'Trace ID',
  type: 'string',
  value: 'traceId',
} as const;

const LIST_DIMENSION: ComposedFilterDimension = {
  label: 'Violation tags',
  type: 'list',
  value: 'violationTags',
} as const;

const NUMBER_DIMENSION: ComposedFilterDimension = {
  label: 'Latency',
  type: 'number',
  value: 'latency',
} as const;

const EMPTY_FILTER = {
  condition: null,
  dimension: null,
  selectedDimension: null,
  shouldChooseCondition: false,
  notApplicableValue: false,
  shouldDisableValueByLackOfCondition: false,
  value: null,
} as const;

describe('useComposedFilter()', () => {
  it('should return one empty filter by default', () => {
    const { result } = getHookRenderer({ initialEntry: '/something' });
    expect(result.current.filters).toStrictEqual([EMPTY_FILTER]);
  });

  it('should clear filters', () => {
    const { result } = getHookRenderer({
      initialEntry: '/something?filter=%5B%7B%22dimension%22%3A%22traceId%22%2C%22value%22%3A%22dd8%22%7D%5D',
    });

    act(() => result.current.clear());
    expect(result.current.filters).toStrictEqual([EMPTY_FILTER]);
  });

  describe('Dimension type=string', () => {
    it('should load string filter', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=%5B%7B%22dimension%22%3A%22traceId%22%2C%22value%22%3A%22dd8%22%7D%5D',
      });
      expect(result.current.filters).toStrictEqual([
        {
          condition: null,
          dimension: STRING_DIMENSION.value,
          selectedDimension: STRING_DIMENSION,
          shouldChooseCondition: false,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: 'dd8',
        },
      ]);
    });

    it('should add a filter', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.addFilter());
      expect(result.current.filters).toStrictEqual([EMPTY_FILTER, EMPTY_FILTER]);
    });

    it('should delete filter', () => {
      const { result } = getHookRenderer({
        initialEntry:
          '/something?filter=[{"condition":"excludes","dimension":"violationTags","value":"injection"}, {}]',
      });

      act(() => result.current.deleteFilter(0)());
      expect(result.current.filters).toStrictEqual([EMPTY_FILTER]);
    });

    it('should replace to a empty filter when deleting the last one', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=[{"condition":"excludes","dimension":"violationTags","value":"injection"}]',
      });

      act(() => result.current.deleteFilter(0)());
      expect(result.current.filters).toStrictEqual([EMPTY_FILTER]);
    });

    it('should set dimension', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(STRING_DIMENSION.value));
      expect(result.current.filters).toStrictEqual([
        {
          condition: null,
          dimension: STRING_DIMENSION.value,
          selectedDimension: STRING_DIMENSION,
          shouldChooseCondition: false,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: null,
        },
      ]);
    });

    it('should set value', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(STRING_DIMENSION.value));
      act(() => result.current.onChangeValue(0)('something'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: null,
          dimension: STRING_DIMENSION.value,
          selectedDimension: STRING_DIMENSION,
          shouldChooseCondition: false,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: 'something',
        },
      ]);
    });
  });

  describe('Dimension type=list', () => {
    it('should load list filter', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=[{"condition":"excludes","dimension":"violationTags","value":"injection"}]',
      });
      expect(result.current.filters).toStrictEqual([
        {
          condition: 'excludes',
          dimension: LIST_DIMENSION.value,
          selectedDimension: LIST_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: 'injection',
        },
      ]);
    });

    it('should set dimension', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(LIST_DIMENSION.value));
      expect(result.current.filters).toStrictEqual([
        {
          condition: null,
          dimension: LIST_DIMENSION.value,
          selectedDimension: LIST_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: true,
          value: null,
        },
      ]);
    });

    it('should set condition', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(LIST_DIMENSION.value));
      act(() => result.current.onChangeCondition(0)('includes'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: 'includes',
          dimension: LIST_DIMENSION.value,
          selectedDimension: LIST_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: null,
        },
      ]);
    });

    it('should set condition and value', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(LIST_DIMENSION.value));
      act(() => result.current.onChangeConditionAndValue(0)('excludes', 'sentiment'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: 'excludes',
          dimension: LIST_DIMENSION.value,
          selectedDimension: LIST_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: 'sentiment',
        },
      ]);
    });

    it('should change condition and keep the value', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=[{"dimension":"violationTags","condition":"includes"}]',
      });

      act(() => result.current.onChangeCondition(0)('excludes'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: 'excludes',
          dimension: LIST_DIMENSION.value,
          selectedDimension: LIST_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: null,
        },
      ]);
    });
  });

  describe('Dimension type=number', () => {
    it('should load number filter', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=[{"condition":">","dimension":"latency","value":"123"}]',
      });
      expect(result.current.filters).toStrictEqual([
        {
          condition: '>',
          dimension: NUMBER_DIMENSION.value,
          selectedDimension: NUMBER_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: '123',
        },
      ]);
    });

    it('should set dimension', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(NUMBER_DIMENSION.value));
      expect(result.current.filters).toStrictEqual([
        {
          condition: null,
          dimension: NUMBER_DIMENSION.value,
          selectedDimension: NUMBER_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: true,
          value: null,
        },
      ]);
    });

    it('should set condition and value', () => {
      const { result } = getHookRenderer({ initialEntry: '/something' });

      act(() => result.current.onChangeDimension(0)(NUMBER_DIMENSION.value));
      act(() => result.current.onChangeConditionAndValue(0)('<', '222'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: '<',
          dimension: NUMBER_DIMENSION.value,
          selectedDimension: NUMBER_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: '222',
        },
      ]);
    });

    it('should change condition but keep the value', () => {
      const { result } = getHookRenderer({
        initialEntry: '/something?filter=[{"condition":">","dimension":"latency","value":"123"}]',
      });

      act(() => result.current.onChangeCondition(0)('<'));
      expect(result.current.filters).toStrictEqual([
        {
          condition: '<',
          dimension: NUMBER_DIMENSION.value,
          selectedDimension: NUMBER_DIMENSION,
          shouldChooseCondition: true,
          notApplicableValue: false,
          shouldDisableValueByLackOfCondition: false,
          value: '123',
        },
      ]);
    });
  });
});

// Helpers
function getHookRenderer({
  initialEntry = '/',
  dimensionOptions = getDefaultDimensionOptions(),
  ...rest
}: Partial<UseComposedFilterSearchParamProps> & {
  initialEntry?: string;
}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );

  return renderHook(() => useComposedFilter({ dimensionOptions, ...rest }), { wrapper });
}

function getDefaultDimensionOptions(): ComposedFilterDimension[] {
  return [STRING_DIMENSION, LIST_DIMENSION, NUMBER_DIMENSION];
}
