import { useDebouncedState } from '@mantine/hooks';
import { CURRENT_FILTER } from '~/utils/searchParamsConstants';
import { FiltersList, ReadyToQueryFilter, filtersListSchema } from '~server/trpc/util/composedFilterSchema';
import { debounce as _debounce } from 'lodash';
import LogRocket from 'logrocket';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDeepCompareEffect } from '../useDeepCompareEffect';
import { ComposedFilter, ComposedFilterDimension } from './types';

const DEBOUNCE_TIME = 1000;

export type UseComposedFilterSearchParamProps = {
  dimensionOptions: readonly ComposedFilterDimension[];
  key?: string;
  handleAdditionalSearchParams?: (newParams: URLSearchParams) => void;
};

export const useComposedFilter = ({
  dimensionOptions,
  key = CURRENT_FILTER,
  handleAdditionalSearchParams,
}: UseComposedFilterSearchParamProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterString = searchParams.get(key);

  // State to manage filters in memory
  const [composedFilters, setComposedFilters] = useState<FiltersList>(readComposedFiltersInitialState(filterString));

  // Initialize debounced filters as null to use it as initial loading state
  const [debouncedFilters, setDebouncedFilters] = useDebouncedState<ReadyToQueryFilter[] | null>(null, DEBOUNCE_TIME, {
    leading: true,
  });

  // Debounce the filter sync to search params, so we don't update the URL on every keystroke
  const syncComposedFiltersToSearchParams = _debounce(() => {
    setSearchParams((nextSearchParams) => {
      handleAdditionalSearchParams?.(nextSearchParams);
      if (composedFilters.length === 0) {
        nextSearchParams.delete(key);
        return nextSearchParams;
      }

      nextSearchParams.set(key, JSON.stringify(composedFilters));
      return nextSearchParams;
    });
  }, DEBOUNCE_TIME);

  const resetComposedFilter = () => {
    setComposedFilters([{}]);
  };

  const shouldChooseConditionForDimension = (dimension: ComposedFilterDimension) => {
    return dimension.type !== 'string' && !dimension.disableCondition;
  };

  const readyToQueryFilters: ReadyToQueryFilter[] = useMemo(() => {
    const list: ReadyToQueryFilter[] = [];
    composedFilters.forEach((f, index) => {
      const dimension = dimensionOptions.find((d) => d.value === f.dimension);
      // If dimension is not found, it means that the filter is not ready to query
      if (!dimension) return;

      // If the dimension requires a condition and it's not set, it means that the filter is not ready to query
      if (shouldChooseConditionForDimension(dimension) && !f.condition) return;

      // If the value is not set, it means that the filter is not ready to query
      if (!f.value && !dimension.disableValue) return;

      list.push({
        dimension: f.dimension ?? '',
        condition: f.condition,
        index,
        value: f.value ?? '',
      });
    });
    return list;
  }, [composedFilters, dimensionOptions]);

  // Update callback listener when filters change
  useDeepCompareEffect(() => {
    setDebouncedFilters(readyToQueryFilters);
    syncComposedFiltersToSearchParams();
  }, [readyToQueryFilters]);

  const addFilter = () => {
    setComposedFilters((prev) => [...prev, {}]);
  };

  const deleteFilter = (index: number) => {
    return () => {
      const newList = composedFilters.filter((_, i) => i !== index);
      if (newList.length === 0) {
        // We don't want to have an empty list, so we always have at least one empty filter
        newList.push({});
      }
      setComposedFilters(newList);
    };
  };

  const onChangeDimension = (indexToUpdate: number) => {
    return (newDimension: string | null) => {
      if (!newDimension && composedFilters.length === 1) {
        resetComposedFilter();
        return;
      }

      setComposedFilters((prev) =>
        prev.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          if (!newDimension) return {};

          return { dimension: newDimension };
        }),
      );
    };
  };

  const onChangeCondition = (indexToUpdate: number) => {
    return (newCondition: string) => {
      setComposedFilters((prev) =>
        prev.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          return {
            dimension: filter.dimension,
            condition: newCondition,
            value: filter.value,
          };
        }),
      );
    };
  };

  const onChangeValue = (indexToUpdate: number) => {
    return (newValue: string) => {
      setComposedFilters((prev) =>
        prev.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          return {
            ...filter,
            value: newValue,
          };
        }),
      );
    };
  };

  const onChangeWholeFilter = (indexToUpdate: number) => {
    return (newValue: FiltersList[0]) => {
      setComposedFilters((prev) =>
        prev.map((filter, index) => {
          if (indexToUpdate !== index) return filter;
          return newValue;
        }),
      );
    };
  };

  const onChangeConditionAndValue = (indexToUpdate: number) => {
    return (newCondition: string, newValue: string) => {
      setComposedFilters((prev) =>
        prev.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          return {
            dimension: filter.dimension,
            condition: newCondition,
            value: newValue,
          };
        }),
      );
    };
  };

  const filters: ComposedFilter[] = composedFilters.map(({ condition, dimension, value }) => {
    const selectedDimension = dimensionOptions.find((d) => d.value === dimension) ?? null;
    const shouldChooseCondition =
      !!selectedDimension &&
      shouldChooseConditionForDimension(selectedDimension) &&
      !selectedDimension?.disableCondition;

    const shouldDisableValueByLackOfCondition = shouldChooseCondition && !condition;

    return {
      condition: condition ?? null,
      dimension: dimension ?? null,
      selectedDimension,
      shouldChooseCondition,
      shouldDisableValueByLackOfCondition,
      notApplicableValue: !!selectedDimension?.disableValue,
      value: value ?? null,
    } satisfies ComposedFilter;
  });

  // if all dimensions have not conditions, then we hide it
  const hideConditionSelection = dimensionOptions.every(({ disableCondition }) => disableCondition);

  return {
    addFilter,
    clear: resetComposedFilter,
    debouncedReadyToQueryFilters: debouncedFilters || [],
    deleteFilter,
    dimensionOptions,
    filters,
    isLoadingFilters: debouncedFilters === null,
    onChangeCondition,
    onChangeDimension,
    onChangeValue,
    onChangeWholeFilter,
    onChangeConditionAndValue,
    readyToQueryFilters,
    hideConditionSelection,
  };
};

function readComposedFiltersInitialState(filterString: string | null): FiltersList {
  const defaultValue: FiltersList = [{}];
  if (!filterString) return defaultValue;

  try {
    return filtersListSchema.parse(JSON.parse(filterString)) ?? defaultValue;
  } catch (error) {
    LogRocket.error('Error parsing filters from search params', error);
    return defaultValue;
  }
}
