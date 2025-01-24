import { ReactElement } from 'react';
import { ListFilterOption } from 'components/composed-filter/ComposedFilterElement';
import { CustomComposedFilters } from 'components/composed-filter/CustomComposedFilters';
import { WhyLabsBadge } from 'components/design-system';
import { NONE_TAGS_GROUP, UserDefinedTags, UserTag } from 'components/tags/UserDefinedTags';
import { useComposedFilter } from 'hooks/composed-filter/useComposedFilter';
import { lowerCaseFirstLetterAndKeepRest } from 'utils/stringUtils';
import { CustomTag } from 'generated/graphql';

import { Colors } from '@whylabs/observatory-lib';
import { datasetTypes, dimensionOptions, mapTagsToFilterOptions, modelTypes, useResourceFilterStyles } from './utils';

export const ResourcesFilter = ({
  resourceTags,
  loading,
  filterViewModel,
}: {
  resourceTags: CustomTag[];
  loading?: boolean;
  filterViewModel: ReturnType<typeof useComposedFilter>;
}): ReactElement => {
  const { classes } = useResourceFilterStyles();
  const { readyToQueryFilters, onChangeValue, deleteFilter } = filterViewModel;

  const handleBadgeListDisplayName = (values: string[], dimension: string) => {
    if (dimension === 'notDefined') return 'Resource type not defined';
    const selectedDimension = dimensionOptions.find(({ value }) => value === dimension);
    return `${selectedDimension?.label ?? selectedDimension?.value} is `.concat(
      values.length > 1
        ? `(any of ${values.length} selected types)`
        : lowerCaseFirstLetterAndKeepRest(values[0] ?? 'not defined'),
    );
  };

  const renderFilterCustomBadges = (
    selectedItems: ListFilterOption[],
    dimension: string,
    defaultComponent: ReactElement,
    filterIndex: number,
  ) => {
    if (filterIndex > 1) return null;
    const totalIndividualFilters = readyToQueryFilters.length;
    const totalFiltersCountWithTags = readyToQueryFilters.flatMap((f) =>
      f.dimension === 'resourceTags' ? f.value.split(',') : [f.dimension],
    ).length;
    if (filterIndex === 1) {
      return (
        <WhyLabsBadge
          className={classes.filtersBadge}
          customColor={Colors.gray900}
          customBackground={Colors.brandSecondary100}
        >
          + {totalFiltersCountWithTags - 1} more
        </WhyLabsBadge>
      );
    }
    if (dimension === 'resourceTags') {
      const tags: UserTag[] = selectedItems.slice(0, 1).map(({ value, color, backgroundColor }) => {
        const tagEntries = value.split(':');
        return {
          label: value,
          customTag: {
            key: tagEntries.length === 1 ? NONE_TAGS_GROUP : tagEntries[0],
            value: tagEntries.length === 1 ? tagEntries[0] : tagEntries[1],
            color,
            backgroundColor,
          },
          onDelete: () => {
            const newValue = selectedItems.flatMap((tag) => (tag.value !== value ? tag.value : [])).join(',');
            if (!newValue) {
              deleteFilter(filterIndex)();
              return;
            }
            onChangeValue(filterIndex)(newValue);
          },
        };
      });
      const resourceTagsCount = selectedItems.length;
      return (
        <>
          <UserDefinedTags tags={tags} maxTagWidth={250} tagsHeight={22} />
          {totalIndividualFilters === 1 && resourceTagsCount > 1 && (
            <WhyLabsBadge
              className={classes.filtersBadge}
              customColor={Colors.gray900}
              customBackground={Colors.brandSecondary100}
            >
              + {resourceTagsCount - 1} more
            </WhyLabsBadge>
          )}
        </>
      );
    }
    return defaultComponent;
  };

  return (
    <CustomComposedFilters
      getListFilterOptionsFor={(dimension) => {
        if (dimension === 'modelType') return modelTypes;
        if (dimension === 'datasetType') return datasetTypes;
        if (dimension === 'resourceTags') return mapTagsToFilterOptions(resourceTags);
        return [];
      }}
      isLoadingOptions={loading}
      composedFilterViewModel={filterViewModel}
      createListDisplayName={handleBadgeListDisplayName}
      convertListValueToReadableName={(n) => n}
      replaceFullDisplayName
      renderFilterCustomBadges={renderFilterCustomBadges}
      filterId="resourcesFilter"
    />
  );
};
