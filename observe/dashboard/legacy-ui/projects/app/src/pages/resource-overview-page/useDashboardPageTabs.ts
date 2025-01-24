import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageType } from 'pages/page-types/usePageType';

export type DashboardPageTabs = 'overview' | 'exec-dash';

export function useDashboardPageTab(): DashboardPageTabs {
  switch (usePageType()) {
    case 'executive':
    case 'datasetsSummary':
    case 'modelsSummary':
    case 'customDashboards':
      return 'exec-dash';
    default:
      return 'overview';
  }
}

type TabLinkProps<T> = {
  id?: string;
  isHidden?: boolean;
  name: string;
  to: string;
  disabledTooltip?: string;
  value: T;
};

type useDashboardPageTabsReturnType = TabLinkProps<DashboardPageTabs>[];

export function useDashboardPageTabs(): useDashboardPageTabsReturnType {
  const { getNavUrl } = useNavLinkHandler();

  const dashboardsTab: TabLinkProps<DashboardPageTabs> = {
    id: 'executive-dashboard',
    isHidden: false,
    name: 'Summary',
    to: getNavUrl({ page: 'customDashboards' }),
    disabledTooltip:
      "Summary dashboards are enabled after you create model or dataset resources, excluding LLMs which aren't supported yet.",
    value: 'exec-dash',
  };

  const resourcesTab: TabLinkProps<DashboardPageTabs> = {
    id: 'all-projects-overview',
    isHidden: false,
    name: 'All Resources',
    to: getNavUrl({ page: 'home' }),
    value: 'overview',
  };

  return [resourcesTab, { ...dashboardsTab, name: 'Dashboards' }];
}
