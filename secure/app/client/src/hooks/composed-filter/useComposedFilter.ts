import { useSearchParams } from 'react-router-dom';
import { CURRENT_FILTER, OFFSET_QUERY_NAME } from '~/utils/searchParamsConstants';
import { FiltersList, ReadyToQueryFilter, filtersListSchema } from '~server/trpc/util/composedFilterSchema';

import { useDeepCompareEffect } from '../useDeepCompareEffect';
import { COMPOSED_FILTER_LIST_CONDITIONS, COMPOSED_FILTER_NUMBER_CONDITIONS } from './composedFilterConditions';
import { ComposedFilter, ComposedFilterDimension } from './types';

type ComposedFiltersOnChangeFn = (filters: ReadyToQueryFilter[]) => void;

export type UseComposedFilterSearchParamProps = {
  dimensionOptions: readonly ComposedFilterDimension[];
  key?: string;
  onChange?: ComposedFiltersOnChangeFn;
  handleAdditionalSearchParams?: (newParams: URLSearchParams) => void;
};

export const useComposedFilter = ({
  dimensionOptions,
  key = CURRENT_FILTER,
  onChange,
  handleAdditionalSearchParams,
}: UseComposedFilterSearchParamProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterString = searchParams.get(key);
  const composedFilters: FiltersList = (() => {
    const defaultValue: FiltersList = [{}];
    if (!filterString) return defaultValue;

    try {
      return filtersListSchema.parse(JSON.parse(filterString)) ?? defaultValue;
    } catch (error) {
      console.error('Error parsing filters from search params', error);
      return defaultValue;
    }
  })();

  const setComposedFilters = (filters: FiltersList) => {
    setSearchParams((newSearchParams) => {
      handleAdditionalSearchParams?.(newSearchParams);
      if (filters.length === 0) {
        newSearchParams.delete(key);
        return newSearchParams;
      }

      // reset pagination offset when filters are applied
      newSearchParams.delete(OFFSET_QUERY_NAME);

      newSearchParams.set(key, JSON.stringify(filters));
      return newSearchParams;
    });
  };

  const resetComposedFilter = () => {
    setComposedFilters([]);
  };

  const shouldChooseConditionForDimension = (dimension: ComposedFilterDimension) => {
    return dimension.type !== 'string';
  };

  const readyToQueryFilters = composedFilters.filter((f): f is ReadyToQueryFilter => {
    const dimension = dimensionOptions.find((d) => d.value === f.dimension);
    // If dimension is not found, it means that the filter is not ready to query
    if (!dimension) return false;

    // If the dimension requires a condition and it's not set, it means that the filter is not ready to query
    if (shouldChooseConditionForDimension(dimension) && !f.condition) return false;

    // If the value is not set, it means that the filter is not ready to query
    return !!f.value;
  });

  // Update callback listener when filters change
  useDeepCompareEffect(() => {
    if (onChange) onChange(readyToQueryFilters);
  }, [readyToQueryFilters]);

  const addFilter = () => {
    setComposedFilters([...composedFilters, {}]);
  };

  const deleteFilter = (index: number) => {
    setComposedFilters(composedFilters.filter((_, i) => i !== index));
  };

  const onChangeDimension = (indexToUpdate: number) => {
    return (newDimension: string | null) => {
      if (!newDimension && composedFilters.length === 1) {
        resetComposedFilter();
        return;
      }

      setComposedFilters(
        composedFilters.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          if (!newDimension) return {};

          return { dimension: newDimension };
        }),
      );
    };
  };

  const onChangeCondition = (indexToUpdate: number) => {
    return (newCondition: string) => {
      setComposedFilters(
        composedFilters.map((filter, index) => {
          if (indexToUpdate !== index) return filter;

          return {
            dimension: filter.dimension,
            condition: newCondition,
          };
        }),
      );
    };
  };

  const onChangeValue = (indexToUpdate: number) => {
    return (newValue: string) => {
      setComposedFilters(
        composedFilters.map((filter, index) => {
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
      setComposedFilters(
        composedFilters.map((filter, index) => {
          if (indexToUpdate !== index) return filter;
          return newValue;
        }),
      );
    };
  };

  const onChangeConditionAndValue = (indexToUpdate: number) => {
    return (newCondition: string, newValue: string) => {
      setComposedFilters(
        composedFilters.map((filter, index) => {
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
    const shouldChooseCondition = !!selectedDimension && shouldChooseConditionForDimension(selectedDimension);
    const shouldDisableValueByLackOfCondition = shouldChooseCondition && !condition;

    const conditionOptions = (() => {
      if (!selectedDimension) return [];

      if (selectedDimension.type === 'number') {
        return COMPOSED_FILTER_NUMBER_CONDITIONS;
      }

      if (selectedDimension.type === 'list') {
        return COMPOSED_FILTER_LIST_CONDITIONS;
      }

      return [];
    })();

    return {
      condition: condition ?? null,
      dimension: dimension ?? null,
      conditionOptions,
      selectedDimension,
      shouldChooseCondition,
      shouldDisableValueByLackOfCondition,
      value: value ?? null,
    } satisfies ComposedFilter;
  });

  return {
    addFilter,
    clear: resetComposedFilter,
    deleteFilter,
    filters,
    onChangeCondition,
    onChangeDimension,
    onChangeValue,
    onChangeWholeFilter,
    onChangeConditionAndValue,
    readyToQueryFilters,
  };
};
