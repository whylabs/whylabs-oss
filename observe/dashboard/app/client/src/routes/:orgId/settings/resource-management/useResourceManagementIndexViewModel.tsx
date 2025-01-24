import { useDebouncedValue } from '@mantine/hooks';
import { useResourceFilter } from '~/components/resources-filter/useResourceFilter';
import { useOrgId } from '~/hooks/useOrgId';
import useSort from '~/hooks/useSort';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { SortByKeys, SortDirection, SortDirectionKeys } from '~/types/sortTypes';
import { EDIT_RESOURCE_TAGS, RESOURCE_ID_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isFreeSubscriptionTier, isItOverSubscriptionLimit } from '~/utils/subscriptionUtils';
import { trpc } from '~/utils/trpc';
import { ResourcesOrderByEnum } from '~server/trpc/meta/resources/types/resource-types';
import LogRocket from 'logrocket';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useResourceManagementIndexViewModel = () => {
  const orgId = useOrgId();
  const { currentUser: user } = useUserContext();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const [searchParams, setSearchParam] = useSearchParams();

  const { renderFilter: renderResourcesFilter, activeFilters: resourceFilters } = useResourceFilter();
  const { sortBy, sortDirection, setSort } = useSort<ResourcesOrderByEnum>({
    defaultSortBy: ResourcesOrderByEnum.CreationTimestamp,
    defaultSortDirection: SortDirection.Desc,
    shouldEmitEventToMainStack: true,
    sortByKey: SortByKeys.sortResourcesBy,
    sortDirectionKey: SortDirectionKeys.sortResourcesDirection,
  });

  const [selectedIdToDelete, setSelectedIdToDelete] = useState('');
  const [filterString, setFilterString] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(filterString, 300);

  const isModalOpen = !!selectedIdToDelete;
  const {
    data: resources,
    isLoading,
    refetch,
  } = trpc.meta.resourcesSettings.listResources.useQuery({
    orgId,
    sortBy,
    sortDirection,
    ...resourceFilters,
    searchTerm: debouncedSearchTerm,
  });

  const { data: orgTagsInUse, isLoading: isLoadingOrgTags } = trpc.meta.organizations.getResourceTagsInUse.useQuery({
    orgId,
  });
  const { data: totalOrgTags, isLoading: isLoadingCountOrgTags } =
    trpc.meta.organizations.countAllOrganizationResourceTags.useQuery({
      orgId,
    });

  const { mutateAsync: deleteResourceMutation } = trpc.meta.resourcesSettings.deleteResource.useMutation();

  const tier = user?.organization?.subscriptionTier;
  const isFreeTier = isFreeSubscriptionTier(tier);
  const isOverSubscriptionLimit = isItOverSubscriptionLimit({ resourceCount: resources?.length, tier });

  const hasData = !!resources?.length;
  const rowsCount = resources?.length;
  const tableRowsCount = isLoading ? 0 : rowsCount;

  const onCancelDeleting = useCallback(() => {
    setSelectedIdToDelete('');
  }, []);

  const onDeleteResource = useCallback(async () => {
    try {
      await deleteResourceMutation({ orgId, id: selectedIdToDelete });

      enqueueSnackbar({ title: `Resource deleted`, variant: 'success' });

      onCancelDeleting();
      refetch();
    } catch (err) {
      const explanation = 'Resource deletion failed';
      LogRocket.error(explanation, err);
      enqueueErrorSnackbar({ explanation, err });
    }
  }, [
    deleteResourceMutation,
    enqueueErrorSnackbar,
    enqueueSnackbar,
    onCancelDeleting,
    orgId,
    refetch,
    selectedIdToDelete,
  ]);

  const onAddNewResource = () => {
    setSearchParam((nextSearchParams) => {
      nextSearchParams.set(RESOURCE_ID_QUERY_NAME, 'new');
      return nextSearchParams;
    });
  };

  const onEditResource = useCallback(
    (id: string) => () => {
      // memoized because is used on table cells
      setSearchParam((nextSearchParams) => {
        nextSearchParams.set(RESOURCE_ID_QUERY_NAME, id);
        return nextSearchParams;
      });
    },
    [setSearchParam],
  );

  const tagsDrawerOpen = searchParams.get(EDIT_RESOURCE_TAGS) === 'true';
  const setTagsDrawerOpen = useCallback(
    (isOpen: boolean) => {
      setSearchParam(
        (nextSearchParams) => {
          if (isOpen) {
            nextSearchParams.set(EDIT_RESOURCE_TAGS, 'true');
          } else {
            nextSearchParams.delete(EDIT_RESOURCE_TAGS);
          }
          return nextSearchParams;
        },
        { replace: true },
      );
    },
    [setSearchParam],
  );

  return {
    filteredResources: resources ?? [],
    filterString,
    hasData,
    isFreeTier,
    isLoading,
    isModalOpen,
    isOverSubscriptionLimit,
    onAddNewResource,
    onCancelDeleting,
    onDeleteResource,
    onEditResource,
    refetchResources: refetch,
    selectedIdToDelete,
    setFilterString,
    setSelectedIdToDelete,
    setSort,
    sortBy,
    sortDirection,
    tableRowsCount,
    tagsDrawerState: {
      value: tagsDrawerOpen,
      setter: setTagsDrawerOpen,
    },
    orgTags: {
      count: totalOrgTags,
      data: orgTagsInUse,
      loading: isLoadingOrgTags,
      loadingCount: isLoadingCountOrgTags,
    },
    renderResourcesFilter,
  };
};
