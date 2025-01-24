import { getCustomTagFromLabel } from '~/components/tags/UserDefinedTags';
import { useComposedFilter } from '~/hooks/composed-filter/useComposedFilter';
import { RESOURCES_FILTER } from '~/utils/searchParamsConstants';
import { CustomTag, ModelType } from '~server/graphql/generated/graphql';
import { ResourceFilters, ResourceTypeFilterOption } from '~server/services/data/songbird/api-wrappers/resources';
import { useCallback, useMemo } from 'react';

import { ResourcesFilter } from './ResourcesFilter';
import { ResourceFilterDimensions, dimensionOptions, mapResourceTypeFilter } from './utils';

export const useResourceFilter = () => {
  const filterViewModel = useComposedFilter({
    dimensionOptions,
    key: RESOURCES_FILTER,
  });
  const { readyToQueryFilters } = filterViewModel;

  const activeFilters: ResourceFilters = useMemo(() => {
    const filters: ResourceFilters = { resourceType: [], resourceTags: [] };
    readyToQueryFilters.forEach((f) => {
      const dimension = f.dimension as ResourceFilterDimensions;
      // eslint-disable-next-line default-case
      switch (dimension) {
        case 'modelType':
        case 'datasetType': {
          const resourceTypes = f.value.split(',');
          const typesToFilter = resourceTypes
            .map((t) => mapResourceTypeFilter.get(t))
            .filter((t): t is ResourceTypeFilterOption => !!t);
          filters.resourceType = (filters?.resourceType ?? []).concat(typesToFilter);
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

  const renderFilter = useCallback(
    (props: { resourceTags: CustomTag[]; loading?: boolean }) => (
      <ResourcesFilter {...props} filterViewModel={filterViewModel} />
    ),
    [filterViewModel],
  );

  return {
    renderFilter,
    activeFilters,
  };
};
