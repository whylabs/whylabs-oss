import { WhyLabsBreadCrumbItem } from '~/components/design-system';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useOrgId } from '~/hooks/useOrgId';
import { useRouteMatchesData } from '~/hooks/useRouteMatchesData';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { DashboardIdLayoutLoaderData } from '~/routes/:orgId/dashboard/:dashboardId/layout/useDashboardIdLayoutLoader';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { IS_DEV_ENV } from '~/utils/constants';
import {
  BACK_TO_QUERY_NAME,
  IS_EMBEDDED_QUERY_NAME,
  SELECTED_ORG_QUERY_NAME,
  USED_ON_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { stringMax } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';
import { useParams } from 'react-router-dom';

export const useWhyLabsBreadCrumbsFactory = () => {
  const orgId = useOrgId();
  const { globalPickerSearchString, backToMainStackURL } = useWhyLabsSearchParams();
  const { widgetId, dashboardId, resourceId } = useParams();

  const dashboardIdLayoutData = useRouteMatchesData<DashboardIdLayoutLoaderData>('orgIdDashboardId');

  const resourceIdToUse = (() => {
    if (resourceId) return resourceId;
    if (dashboardIdLayoutData?.usedOn?.resourceId) return dashboardIdLayoutData.usedOn.resourceId;
    return '';
  })();

  const { data: orgData, isLoading: isLoadingOrgData } = trpc.meta.memberships.describeOrganization.useQuery({ orgId });
  const { data: resourceData, isLoading: isLoadingResourceData } = trpc.meta.resources.describe.useQuery(
    { orgId, id: resourceIdToUse },
    { enabled: !!resourceIdToUse },
  );
  const { getNavUrl } = useNavLinkHandler();

  const { isEmbedded } = useIsEmbedded();

  const isCreateDashboard = dashboardId === AppRoutePaths.create;
  const isCreateChart = widgetId === AppRoutePaths.newWidget;

  const concatFixedSearchString = (url: string) => {
    return `${url}?${IS_EMBEDDED_QUERY_NAME}=${isEmbedded ? 'true' : 'false'}`
      .concat(globalPickerSearchString ? `&${globalPickerSearchString}` : '')
      .concat(dashboardIdLayoutData?.usedOn ? `&${USED_ON_QUERY_NAME}=${dashboardIdLayoutData.usedOn.raw}` : '')
      .concat(backToMainStackURL ? `&${BACK_TO_QUERY_NAME}=${backToMainStackURL}` : '');
  };

  const concatMainStackParams = (url: string) =>
    url
      .concat(`?${SELECTED_ORG_QUERY_NAME}=${orgId}`)
      .concat(globalPickerSearchString ? `&${globalPickerSearchString}` : '');

  const orgCrumb: WhyLabsBreadCrumbItem = {
    title: (() => {
      if (isLoadingOrgData) return 'Loading...';
      if (!orgData) return 'WhyLabs';
      return stringMax(`${orgData.name || 'Organization'} (${orgData.id})`, 24);
    })(),
    // This is a hack to back to ui-exp project dashboard
    href: IS_DEV_ENV ? getNavUrl({ page: 'resources' }) : concatMainStackParams(`${window.location.origin}/resources`),
    isMainStackLink: !IS_DEV_ENV,
  };

  const resourceCrumb: WhyLabsBreadCrumbItem = {
    title: (() => {
      if (isLoadingResourceData) return 'Loading...';
      if (!resourceData) return 'Resource';
      return resourceData.name || resourceData.id || 'Resource';
    })(),
    // This is a hack to back to ui-exp resource summary
    href: concatMainStackParams(
      `${window.location.origin}/resources${resourceIdToUse ? '/'.concat(resourceIdToUse) : ''}`,
    ),
    isMainStackLink: true,
  };

  const myDashboardsListCrumb: WhyLabsBreadCrumbItem = {
    title: 'My dashboards',
    // This is a hack to back to ui-exp dashboard listing when we use new stack embedded in iframe
    href: isEmbedded
      ? backToMainStackURL || concatMainStackParams(`${window.location.origin}/summary/dashboards`)
      : concatFixedSearchString(`/${orgId}/${AppRoutePaths.orgIdDashboards}`),
    isMainStackLink: isEmbedded,
  };

  const myDashboardIdCrumb: WhyLabsBreadCrumbItem = {
    title: isCreateDashboard ? 'New dashboard' : 'Dashboard',
    href: concatFixedSearchString(`/${orgId}/dashboards/${dashboardId ?? AppRoutePaths.create}`),
  };

  const myDashboardsChartIdCrumb: WhyLabsBreadCrumbItem = {
    title: isCreateChart ? 'Widget preview' : 'Edit widget',
  };

  return {
    orgCrumb,
    resourceCrumb,
    myDashboards: {
      myDashboardsListCrumb,
      myDashboardIdCrumb,
      myDashboardsChartIdCrumb,
    },
  };
};
