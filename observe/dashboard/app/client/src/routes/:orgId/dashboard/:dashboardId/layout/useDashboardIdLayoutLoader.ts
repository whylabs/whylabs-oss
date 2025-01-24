import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { USED_ON_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { readUsedOnDashboard } from '~server/trpc/dashboard/util/dashboardUtils';
import { LoaderFunction } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (async ({ params, request }) => {
  const { orgId, dashboardId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(dashboardId, 'dashboardId must exist in this route');

  const url = new URL(request.url);
  const usedOn = url.searchParams.get(USED_ON_QUERY_NAME);

  if (dashboardId === AppRoutePaths.create) {
    return { dashboard: null, orgId, dashboardId, usedOn: readUsedOnDashboard(usedOn) };
  }

  const dashboard = await trpcProxyClient.dashboard.custom.describe.query({ id: dashboardId, orgId });
  invariant(dashboard, 'Dashboard not found');

  return { dashboard, orgId, dashboardId, usedOn: readUsedOnDashboard(dashboard?.schema?.metadata?.usedOn) };
}) satisfies LoaderFunction;

export type DashboardIdLayoutLoaderData = LoaderData<typeof loader>;
