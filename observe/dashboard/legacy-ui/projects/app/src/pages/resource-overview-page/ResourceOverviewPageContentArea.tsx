import { useCallback, useMemo } from 'react';
import { createStyles } from '@mantine/core';
import OverviewHeaderPanel from 'components/panels/OverviewHeaderPanel';
import {
  AssetCategory,
  CustomTag,
  ModelOverviewInfoFragment,
  SortDirection,
  useGetAllResourcesForOverviewPageQuery,
  useGetModelOverviewInformationQuery,
} from 'generated/graphql';
import ResourceOverviewCardLayout from 'pages/resource-overview-page/components/ResourceOverviewCardLayout/ResourceOverviewCardLayout';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { VIEW_TYPE } from 'types/navTags';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import useSort from 'hooks/useSort';
import { AllAccessors, ModelSortBy, SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { canManageDatasets } from 'utils/permissionUtils';
import { useUserContext } from 'hooks/useUserContext';
import { useDeepCompareMemo } from 'use-deep-compare';
import { useSearchParams } from 'react-router-dom';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import UnexpectedErrorPage from 'pages/model-not-found/UnexpectedErrorPage';
import { useDebouncedValue } from '@mantine/hooks';
import { useResourceFilter } from 'components/resources-filter/useResourceFilter';
import { getCustomTagLabel } from 'components/tags/UserDefinedTags';
import DashboardLayout from './components/TableDashboard/DashboardLayout';
import { asLayoutTypeOrDefault, LayoutType, ResourceOverviewData } from './layoutHelpers';
import { SearchAndFilterCombo } from './components/ResourcesOverviewFilter/SearchAndFilterCombo';

const accessorsMapper = new Map<ModelSortBy, AllAccessors<ResourceOverviewData>>([
  ['Name', ['name']],
  ['Freshness', ['dataAvailability', 'latestTimestamp']],
  ['LatestAlert', ['latestAnomalyTimestamp']],
  ['AnomaliesInRange', ['totalAnomaliesInRange']],
  ['ResourceType', ['modelType']],
  ['CreationTime', ['creationTime']],
]);

const useContentAreaStyles = createStyles({
  panelRoot: {
    display: 'flex',
    flexBasis: Spacings.tabContentHeaderHeight,
  },
  panelCardRoot: {
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
});

export function ResourceOverviewPageContentArea(): JSX.Element {
  const { classes, cx } = useContentAreaStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { handleNavigation } = useNavLinkHandler();
  const [searchParams] = useSearchParams();
  useSetHtmlTitle('Project dashboard');

  const searchTerm = searchParams.get(FilterKeys.searchString) ?? undefined;
  const normalizedTerm = searchTerm?.toLowerCase();
  const [debouncedSearchTerm] = useDebouncedValue(normalizedTerm, 250);

  const { renderFilter, activeFilters: newResourceFilters, addResourceTagToFilter } = useResourceFilter();
  const hasActiveResourceFilters = !!(
    newResourceFilters.resourceType?.length || newResourceFilters.resourceTags?.length
  );

  const { data: allResources, loading: loadingAllResourcesData } = useGetAllResourcesForOverviewPageQuery();
  const {
    data,
    loading: loadingFilteredResources,
    error,
    refetch,
  } = useGetModelOverviewInformationQuery({
    variables: {
      ...dateRange,
      ...{ ...newResourceFilters, searchTerm: hasActiveResourceFilters ? '' : debouncedSearchTerm },
    },
    skip: loadingDateRange,
  });

  const resourcesLoading = loadingFilteredResources || loadingAllResourcesData;

  const resourceTagsInUse = useMemo(() => {
    const tags = new Map<string, CustomTag>([]);
    allResources?.models?.forEach(({ resourceTags }) =>
      resourceTags.forEach((customTag) => tags.set(getCustomTagLabel(customTag), customTag)),
    );
    return [...tags.values()];
  }, [allResources?.models]);

  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageDatasets = canManageDatasets(user);

  const { sortDirection, sortBy, handleSort, setSort } = useSort<ModelSortBy>(
    SortByKeys.sortModelBy,
    SortDirectionKeys.sortModelDirection,
  );

  const modelsHaveBeenConfigured = useCallback(() => {
    if (allResources) {
      return allResources.models.some((model) => model.dataLineage?.oldestProfileTimestamp);
    }
    return false;
  }, [allResources]);

  const mapResources = (resourcesData?: ModelOverviewInfoFragment[]): ResourceOverviewData[] =>
    resourcesData?.map((r) => {
      const totalAnomaliesInRange =
        r.anomalyCounts?.timeseries?.reduce((acc, curr) => {
          const dayCount = curr.counts.reduce((dayTotal, current) => dayTotal + current.count, 0);
          return acc + dayCount;
        }, 0) ?? 0;
      return {
        ...r,
        totalAnomaliesInRange,
      };
    }) ?? [];

  const sortData = useCallback(
    (
      nextSortDirection: SortDirectionType,
      newSortBy: ModelSortBy = 'LatestAlert',
      usedData?: ResourceOverviewData[],
    ) => {
      const models = usedData || mapResources(data?.models);
      const accessors = accessorsMapper.get(newSortBy) ?? [];
      return handleSort<ResourceOverviewData>(models, nextSortDirection, newSortBy, accessors);
    },
    [data?.models, handleSort],
  );

  const filteredResources = useMemo(() => {
    const resources = mapResources(data?.models);
    return sortData(sortDirection ?? SortDirection.Desc, sortBy, resources);
  }, [data?.models, sortBy, sortData, sortDirection]);

  function generateCardLayout() {
    return (
      <ResourceOverviewCardLayout
        searchTerm={searchParams.get(FilterKeys.searchString) ?? undefined}
        loading={loadingFilteredResources}
        error={error}
        sortByDirection={sortDirection}
        sortBy={sortBy}
        userCanManageDatasets={userCanManageDatasets}
        filteredData={filteredResources}
        withTags
        addResourceTagToFilter={addResourceTagToFilter}
      />
    );
  }

  function generateTableLayout() {
    return (
      <DashboardLayout
        searchTerm={searchParams.get(FilterKeys.searchString) ?? undefined}
        models={filteredResources}
        sortDirection={sortDirection}
        sortBy={sortBy}
        handleSort={setSort}
        loading={loadingFilteredResources}
        refetchData={refetch}
        setIsOpen={navigateToAddResource}
        userCanManageDatasets={userCanManageDatasets}
        withTags
        addResourceTagToFilter={addResourceTagToFilter}
      />
    );
  }

  const layoutType = useDeepCompareMemo(() => {
    return asLayoutTypeOrDefault(searchParams.get(VIEW_TYPE));
  }, [searchParams]);

  function generateLayout(layout: LayoutType) {
    if (error) return <UnexpectedErrorPage />;

    return layout === 'card' ? generateCardLayout() : generateTableLayout();
  }

  const resourcesCount = useMemo(() => {
    const datasetsCount = filteredResources.filter((r) => r.assetCategory === AssetCategory.Data)?.length ?? 0;
    const modelsCount = (filteredResources.length ?? 0) - datasetsCount;
    return { modelsCount, datasetsCount };
  }, [filteredResources]);

  return (
    <>
      <div className={cx(classes.panelRoot, layoutType === 'card' && classes.panelCardRoot)}>
        <SearchAndFilterCombo
          filterComponent={renderFilter({ resourceTags: resourceTagsInUse, loading: loadingAllResourcesData })}
          hasActiveFilters={hasActiveResourceFilters}
          sortBy={sortBy ?? 'LatestAlert'}
          sortSetter={setSort}
          sortByDirection={sortDirection}
        />

        <OverviewHeaderPanel
          loading={resourcesLoading}
          error={error}
          modelsHaveBeenConfigured={modelsHaveBeenConfigured()}
          addResource={navigateToAddResource}
          userCanManageDatasets={userCanManageDatasets}
          datasetCount={resourcesCount.datasetsCount}
          modelsCount={resourcesCount.modelsCount}
          hasLayoutToggle
          hideDailyAnomalyGraph={hasActiveResourceFilters}
        />
      </div>
      <>{generateLayout(layoutType)}</>
    </>
  );

  function navigateToAddResource() {
    handleNavigation({ page: 'settings', settings: { path: 'model-management' } });
  }
}
