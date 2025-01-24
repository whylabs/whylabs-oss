import { SupportedRoute } from 'hooks/usePageLinkHandler';
import { PageType } from 'pages/page-types/pageType';
import { usePageType } from 'pages/page-types/usePageType';

// These dimensions define the values of the design as a
// 6-column, 4-row grid.
export const GRID_COLUMN_WIDTH_PX = 220;
export const GRID_ROW_HEIGHT_PX = 110;
export const GRID_GAP_PX = 20;
export const GRID_PADDING_PX = 20;

export const mapTabToNavigationPath = new Map<string, SupportedRoute>([
  ['Dataset Summary', 'datasetsSummary'],
  ['Model Summary', 'modelsSummary'],
  ['My Dashboards', 'customDashboards'],
]);

export const mapPageTypeToTabLabel = new Map<PageType, string>([
  ['datasetsSummary', 'Dataset Summary'],
  ['modelsSummary', 'Model Summary'],
  ['customDashboards', 'My Dashboards'],
]);

export const tabsOptions = [
  { label: 'Dataset Summary', value: 'datasetsSummary' },
  { label: 'Model Summary', value: 'modelsSummary' },
  { label: 'My Dashboards', value: 'customDashboards' },
] as const;

export function useExecutiveDashTab(): typeof tabsOptions[number] {
  const pt = usePageType();
  const fallback = tabsOptions[2];
  switch (pt) {
    case 'datasetsSummary':
      return tabsOptions[0];
    case 'modelsSummary':
      return tabsOptions[1];
    case 'customDashboards':
    default:
      return fallback;
  }
}
