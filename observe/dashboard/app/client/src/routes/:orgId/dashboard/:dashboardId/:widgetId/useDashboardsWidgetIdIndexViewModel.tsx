import { useWhyLabsBreadCrumbsFactory } from '~/components/design-system/bread-crumbs/useWhyLabsBreadCrumbsFactory';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { dashboardSupportedWidgetsMapper } from '~/routes/:orgId/dashboard/:dashboardId/utils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { WIDGET_TYPE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { WidgetType } from '~server/trpc/dashboard/types/dashboards';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { useDashboardIdLayoutContext } from '../layout/DashboardIdLayout';

export const loader = (({ params, request }) => {
  const { widgetId, dashboardId, orgId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(widgetId, 'widgetId must exist in this route');
  invariant(dashboardId, 'dashboardId must exist in this route');
  const widgetType = new URL(request.url).searchParams.get(WIDGET_TYPE_QUERY_NAME) ?? 'timeseries';
  const foundSupportedWidget: WidgetType = dashboardSupportedWidgetsMapper.get(widgetType) ?? 'timeseries';
  return { widgetId, dashboardId, orgId, widgetType: foundSupportedWidget };
}) satisfies LoaderFunction;

export function useDashboardsWidgetIdIndexViewModel() {
  const { widgetId, dashboardId, widgetType } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const flags = useFlags();
  const { getWidgetById, onSaveWidget } = useDashboardIdLayoutContext();
  const isNewWidget = widgetId === AppRoutePaths.newWidget;

  const widget = getWidgetById(widgetId);

  const { orgCrumb, resourceCrumb, myDashboards } = useWhyLabsBreadCrumbsFactory();
  const breadCrumbs = { orgCrumb, resourceCrumb, ...myDashboards };

  const onClosePage = () => {
    handleNavigation({ page: 'dashboards', dashboards: { dashboardId } });
  };

  const creationWidgetType: WidgetType | null = (() => {
    if (!flags.customDashComparisonWidgets) return 'timeseries';
    return isNewWidget ? widgetType : null;
  })();

  return {
    widget,
    breadCrumbs,
    onClosePage,
    onSaveWidget,
    dashboardId,
    creationWidgetType,
    isNewWidget,
  };
}
