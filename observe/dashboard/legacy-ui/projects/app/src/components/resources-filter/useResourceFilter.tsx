import { getCustomTagFromLabel } from 'components/tags/UserDefinedTags';
import { useComposedFilter } from 'hooks/composed-filter/useComposedFilter';
import { useCallback, useMemo } from 'react';
import { CustomTag, ModelType } from 'generated/graphql';

import { FilterKeys } from 'hooks/useFilterQueryString';
import { ResourcesFilter } from './ResourcesFilter';
import { ResourceFilterDimensions, dimensionOptions, mapResourceTypeFilter, ResourceFilters } from './utils';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useResourceFilter = () => {
  const filterViewModel = useComposedFilter({
    dimensionOptions,
    key: FilterKeys.resourcesFilter,
  });
  const { readyToQueryFilters, addFilter, onChangeValue, onChangeWholeFilter } = filterViewModel;

  const activeFilters: ResourceFilters = useMemo(() => {
    const filters: ResourceFilters = { resourceType: [], resourceTags: [] };
    readyToQueryFilters.forEach((f) => {
      const dimension = f.dimension as ResourceFilterDimensions;
      // eslint-disable-next-line default-case
      switch (dimension) {
        case 'modelType':
        case 'datasetType': {
          const resourceTypes = f.value.split(',').map((t) => mapResourceTypeFilter.get(t));
          const typesToFilter = resourceTypes
            // graphQL need a separate field to search secured LLMs
            .filter((t): t is ModelType => !!t && t !== 'secured-llm');
          filters.resourceType = (filters?.resourceType ?? []).concat(typesToFilter);
          if (resourceTypes.find((t) => t === 'secured-llm')) {
            filters.onlySecuredLLM = true;
          }
          break;
        }
        case 'notDefined':
          filters.resourceType = (filters?.resourceType ?? []).concat([ModelType.Unknown]);
          break;
        case 'resourceTags': {
          const tags = f.value.split(',');
          const customTags = tags.map((stringTag) => getCustomTagFromLabel(stringTag));
          filters.resourceTags = (filters?.resourceTags ?? []).concat(customTags);
          break;
        }
      }
    });
    return filters;
  }, [readyToQueryFilters]);

  const addResourceTagToFilter = useCallback(
    (newTags: string[]) => {
      const currentTagFilter = readyToQueryFilters.find((f) => f.dimension === 'resourceTags');
      if (currentTagFilter) {
        const updatedValue = new Set(currentTagFilter.value.split(',').concat(newTags));
        onChangeValue(currentTagFilter.index)([...updatedValue].join(','));
        return;
      }
      const currentEmptyFilter = readyToQueryFilters.find((f) => f.dimension && !f.value);
      const newValue = newTags.join(',');
      if (currentEmptyFilter || !readyToQueryFilters?.length) {
        onChangeWholeFilter(currentEmptyFilter?.index ?? 0)({ dimension: 'resourceTags', value: newValue });
        return;
      }
      addFilter({ dimension: 'resourceTags', value: newValue });
    },
    [addFilter, onChangeValue, onChangeWholeFilter, readyToQueryFilters],
  );

  const renderFilter = useCallback(
    (props: { resourceTags: CustomTag[]; loading?: boolean }) => (
      <ResourcesFilter {...props} filterViewModel={filterViewModel} />
    ),
    [filterViewModel],
  );

  return {
    renderFilter,
    activeFilters,
    addResourceTagToFilter,
  };
};
