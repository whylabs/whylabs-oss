import { useIsDemoOrg } from '~/hooks/useIsDemoOrg';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useCheckMembershipRole } from '~/hooks/useIsViewerOnly';
import { useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { useOrganizationsList } from '~/hooks/useOrganizationsList';
import useSearchText from '~/hooks/useSearchText';
import useSort from '~/hooks/useSort';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { SortByKeys, SortDirection, SortDirectionKeys } from '~/types/sortTypes';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { trpc } from '~/utils/trpc';
import { CustomDashboardOrderByEnum } from '~server/trpc/dashboard/types/dashboards';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (({ params }) => {
  const { orgId } = params;
  invariant(orgId, 'orgId must exist in this route');

  return { orgId };
}) satisfies LoaderFunction;

export function useDashboardIndexViewModel() {
  const { orgId } = useLoaderData() as LoaderData<typeof loader>;
  const { isEmbeddedIntoCustomContext, isEmbedded } = useIsEmbedded();
  const membershipRole = useCheckMembershipRole();
  const isDemoOrg = useIsDemoOrg();
  const { organizationsList, onChangeOrganization } = useOrganizationsList();
  const { searchText, debouncedSearchText, setSearchText } = useSearchText();
  const { navigate: navigateMainStack, urlReplace } = useMainStackCustomEventsEmitters();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { sortBy, sortDirection, setSort } = useSort<CustomDashboardOrderByEnum>({
    defaultSortBy: CustomDashboardOrderByEnum.CreationTimestamp,
    defaultSortDirection: SortDirection.Desc,
    shouldEmitEventToMainStack: true,
    sortByKey: SortByKeys.sortDashboardsBy,
    sortDirectionKey: SortDirectionKeys.sortDashboardsDirection,
  });
  const { getNavUrl } = useNavLinkHandler();
  const cloneDashboardMutation = trpc.dashboard.custom.clone.useMutation();
  const deleteDashboardMutation = trpc.dashboard.custom.delete.useMutation();

  const {
    data,
    isLoading,
    refetch: refetchList,
  } = trpc.dashboard.custom.list.useQuery({
    orgId,
    searchText: debouncedSearchText,
    sortBy,
    sortDirection,
  });

  function onClosePage() {
    forceRedirectToOrigin();
  }

  const navigateToResourcePage = (id: string) => {
    navigateMainStack({ modelId: id, page: 'summary', data: {} });
  };

  const getDashboardNavigationToOldStackUrl = (id: string) => {
    const path = getNavUrl({
      page: 'dashboards',
      dashboards: { dashboardId: id },
      setParams: [{ name: 'embedded', value: 'true' }],
    });
    return window.location.origin.concat(path);
  };

  const emitDashboardNavigationEventToOldStack = (id: string) => {
    urlReplace(getDashboardNavigationToOldStackUrl(id));
  };

  const emitDashboardCreateEventToOldStack = () => {
    const path = getNavUrl({
      page: 'dashboards',
      dashboards: { dashboardId: AppRoutePaths.create },
      setParams: [{ name: 'embedded', value: 'true' }],
    });
    urlReplace(window.location.origin.concat(path));
  };

  const cloneDashboard = async (id: string) => {
    // Prevent clone spam
    if (cloneDashboardMutation.isLoading) return;

    try {
      await cloneDashboardMutation.mutateAsync({ orgId, id });
      await refetchList();
    } catch (e) {
      // do nothing
    }
  };

  const deleteDashboard = async (id: string) => {
    if (deleteDashboardMutation.isLoading) return;
    await deleteDashboardMutation.mutateAsync({ orgId, id });
    await refetchList();
    enqueueSnackbar({ title: 'Dashboard deleted' });
  };

  return {
    cloneDashboard,
    dashboards: {
      isLoading,
      list: data?.list ?? [],
      totalCount: data?.totalCount ?? 0,
    },
    deleteDashboard,
    emitDashboardCreateEventToOldStack,
    emitDashboardNavigationEventToOldStack,
    getDashboardNavigationToOldStackUrl,
    navigateToResourcePage,
    lastVisited: data?.lastVisited,
    onChangeOrganization,
    onClosePage,
    orgId,
    organizationsList,
    searchText,
    setSearchText,
    setSort,
    sortBy,
    sortDirection,
    isEmbeddedIntoCustomContext,
    isEmbedded,
    isDemoOrg,
    membershipRole,
  };
}
