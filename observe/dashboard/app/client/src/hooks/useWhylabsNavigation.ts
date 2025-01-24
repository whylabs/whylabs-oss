import { AppRoutePaths } from '~/types/AppRoutePaths';
import { SortByKeys, SortDirectionKeys } from '~/types/sortTypes';
import { getOldStackOriginUrl } from '~/utils/oldStackUtils';
import { removeKeys } from '~/utils/queryCleaner';
import {
  CURRENT_FILTER,
  FILTERED_TRACES,
  PAGING_TAGS,
  SELECTED_ALL_TRACES,
  SELECTED_EMBEDDINGS_SPACE,
  SELECTED_ORG_QUERY_NAME,
  STICKY_PARAMS,
  TEMP_PARAMS,
  USED_ON_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const BASE_ROUTES = [
  // 'notFound', TODO: add 404 route
  'home',
  'dashboards',
  'resources',
  'settings',
  'monitor-manager',
] as const;
const RESOURCE_ROUTES = ['llm-secure', 'segment-analysis'] as const;
const ALL_SUPPORTED_ROUTES = [...BASE_ROUTES, ...RESOURCE_ROUTES] as const;
export type SupportedRoute = (typeof ALL_SUPPORTED_ROUTES)[number];
const StickyParams = [...STICKY_PARAMS] as const;

const AutoRemovedParams = [...TEMP_PARAMS] as const;

type RemovableQueryParams = (typeof AutoRemovedParams)[number];
export type QueryParams = RemovableQueryParams | (typeof StickyParams)[number];
type SaveParams = Array<RemovableQueryParams>;
export type NavHandlerSearchParams = { name: QueryParams; value: string | string[] | null }[];
interface NavigationParams {
  page: SupportedRoute;
  resourceId?: string;
  ignoreOldQueryString?: boolean;
  dashboards?: DashboardsProps;
  llmSecure?: LLMSecureProps;
  settings?: SettingsProps;
  monitorManager?: MonitorManagerProps;
  // segmentTags?: SegmentTag[]; we don't have segmented views yet
  saveParams?: SaveParams;
  setParams?: NavHandlerSearchParams;
}

type LLMSecureTraceProps = {
  path: 'traces';
  traceId?: string;
  traceItem?: string;
  page?: 'embeddings-projector';
};
type LLMSummaryProps = {
  path: 'summary';
};
type LLMSecurePolicyProps = {
  path: 'policy';
  page?: 'advanced-settings' | 'change-history';
};
export type LLMSecureProps = LLMSecureTraceProps | LLMSummaryProps | LLMSecurePolicyProps;
const getLLMSecureRoute = (baseUrl: string, searchString: string, props?: LLMSecureProps) => {
  let url = baseUrl.concat('/llm-secure');
  if (!props?.path) return url.concat(searchString);
  if (props.path === 'summary') {
    return url.concat(`/summary${searchString}`);
  }
  if (props.path === 'policy') {
    if (!props?.page) return url.concat(`/policy${searchString}`);
    return url.concat(`/policy/${props.page}${searchString}`);
  }
  if (props.path === 'traces' && props?.page === 'embeddings-projector') {
    return url.concat(`/traces/embeddings-projector${searchString}`);
  }
  if (props.path === 'traces') {
    url = url.concat(`/${props.path}`);
    const { traceId, traceItem } = props;
    if (!traceId) return url.concat(searchString);
    url = url.concat(`/${traceId}`);
    if (!traceItem) return url.concat(searchString);
    return url.concat(`/${traceItem}`).concat(searchString);
  }
  return url.concat(searchString);
};

type DashboardsProps = {
  // use 'create' id for creation
  dashboardId?: string;
  // use 'new-chart' id for creation
  graphId?: string;
};
const getDashboardsRoute = (baseUrl: string, props?: DashboardsProps) => {
  let url = baseUrl.concat(`/${AppRoutePaths.orgIdDashboards}`);
  const { dashboardId, graphId } = props ?? {};
  if (!dashboardId) return url;
  url = url.concat(`/${dashboardId}`);
  if (!graphId) return url;
  return url.concat(`/${graphId}`);
};

export type SettingsPath =
  | 'access-tokens'
  | 'billing'
  | 'integrations'
  | 'notifications'
  | 'resource-management'
  | 'resource-management/new'
  | 'user-management';

type SettingsProps = {
  path: SettingsPath;
  id?: string;
};
const getSettingsRoute = (baseUrl: string, props?: SettingsProps) => {
  const url = baseUrl.concat(`/${AppRoutePaths.orgIdSettings}`);

  if (!props?.path) return url;

  if (props.path === 'notifications' && props.id) {
    const encodedId = decodeURIComponent(props.id);
    return `${url}/${props.path}/${encodedId}`;
  }

  return url.concat(`/${props.path}`);
};

type MonitorManagerPath =
  | 'audit-log'
  | 'presets'
  | 'anomalies-feed'
  | 'monitor-runs'
  | 'config-investigator'
  | 'customize-ui'
  | 'customize-json';

type MonitorManagerProps = {
  path: MonitorManagerPath;
  id?: string;
};

const getMonitorManagerRoute = (baseUrl: string, props?: MonitorManagerProps) => {
  let url = `${baseUrl}/monitor-manager`;
  if (!props) return url;

  const { path, id } = props;
  const encodedId = decodeURIComponent(id ?? '');
  url = encodedId ? `${url}/${path}/${encodedId}` : `${url}/${path}`;
  return url;
};

const getUrlParamsToRemove = (saveParams?: SaveParams): RemovableQueryParams[] => {
  const saveKeys: Set<RemovableQueryParams> = new Set(saveParams);
  return AutoRemovedParams.filter((k) => !!k && !saveKeys.has(k));
};

export const handleSetParams = (
  setParams: UniversalNavigationParams['setParams'],
  usedSearchString: string,
): string => {
  const urlParams = new URLSearchParams(usedSearchString);
  setParams?.forEach(({ name, value }) => {
    if (!value) {
      urlParams.delete(name);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((param) => urlParams.append(name, param));
      return;
    }
    urlParams.set(name, value);
  });
  const newSearchString = urlParams.toString();
  return newSearchString ? `?${newSearchString}` : '';
};

export function generateNavUrl(
  params: UniversalNavigationParams & { orgId: string },
  foundSearchString: string,
): string {
  const { ignoreOldQueryString, resourceId, setParams, page, orgId, dashboards, llmSecure, settings, monitorManager } =
    params;
  const searchString = ignoreOldQueryString ? '' : foundSearchString;
  const usedSearchString = handleSetParams(setParams, searchString);
  const isBaseRoute = BASE_ROUTES.find((p) => p === page);
  const invalidParams = !isBaseRoute && !resourceId;
  const newPage = invalidParams ? 'invalid' : page;
  const baseUrl = `/${orgId}${resourceId && !isBaseRoute ? `/${resourceId}` : ''}`;

  switch (newPage) {
    case 'home':
      return `${baseUrl}/${AppRoutePaths.orgIdResourcesSummary}${usedSearchString}`;
    // case 'notFound': TODO 404 page
    //   return `${Pages.notFound}${usedSearchString}`;
    case 'dashboards':
      return `${getDashboardsRoute(baseUrl, dashboards)}${usedSearchString}`;
    case 'llm-secure':
      return getLLMSecureRoute(baseUrl, usedSearchString, llmSecure);
    case 'segment-analysis':
      return baseUrl.concat(`/${AppRoutePaths.resourceIdSegmentAnalysis}${usedSearchString}`);
    case 'resources':
      return baseUrl.concat(`/${AppRoutePaths.orgIdResourcesSummary}${usedSearchString}`);
    case 'settings':
      return `${getSettingsRoute(baseUrl, settings)}${usedSearchString}`;
    case 'monitor-manager':
      return `${getMonitorManagerRoute(baseUrl, monitorManager)}${usedSearchString}`;
    case 'invalid':
    default:
      // let's just do nothing if we have an invalid link... force to back to ui-exp sounds very dramatic
      return window.location.href.replace(window.location.origin, '');
  }
}

const routeStickyParamsMap = new Map<SupportedRoute, RemovableQueryParams[]>([
  [
    'llm-secure',
    [
      CURRENT_FILTER,
      FILTERED_TRACES,
      SELECTED_ALL_TRACES,
      SELECTED_EMBEDDINGS_SPACE,
      SortByKeys.sortTracesBy,
      SortDirectionKeys.sortTracesDirection,
      ...PAGING_TAGS,
    ],
  ],
  ['dashboards', [USED_ON_QUERY_NAME, SortByKeys.sortDashboardsBy, SortDirectionKeys.sortDashboardsDirection]],
]);

const getParamsToSave = ({ page, saveParams }: UniversalNavigationParams) => {
  const params = routeStickyParamsMap.get(page) ?? [];
  if (saveParams) params.push(...saveParams);
  return params;
};

type UniversalNavigationParams = NavigationParams;
/**
 * A universal navigation link handling hook
 *
 * @returns A function to get a nav URL from a set of parameters and another function to simply navigate there on invocation.
 * @param manualOrg Override orgId -- used in case of having not orgId in url params, like the app root path
 */
export const useNavLinkHandler = (manualOrg?: string | null) => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { orgId, resourceId } = useParams<{ orgId: string; resourceId?: string }>();
  const usedOrgId = manualOrg || orgId;
  const getSearchString = (saveParams?: SaveParams) => {
    return search ? removeKeys(getUrlParamsToRemove(saveParams), search) : '';
  };

  function getOldStackUrl(path: string): string {
    const base = getOldStackOriginUrl();

    return `${base}${path}?${SELECTED_ORG_QUERY_NAME}=${usedOrgId}`;
  }

  function getNavUrl({ resourceId: manualResourceId, ...props }: UniversalNavigationParams): string {
    const saveParams = getParamsToSave(props);
    const searchString = getSearchString(saveParams);
    if (!usedOrgId) return window.location.origin;
    return generateNavUrl({ ...props, orgId: usedOrgId, resourceId: manualResourceId || resourceId }, searchString);
  }

  function handleNavigation(props: UniversalNavigationParams): void {
    const path = getNavUrl(props);
    if (!usedOrgId) {
      replaceBrowserLocation(path);
      return;
    }
    navigate(path);
  }

  // Used when we want to navigate to old-stack
  function replaceBrowserLocation(url: string): void {
    window.location.href = url;
  }

  return {
    search,
    getNavUrl,
    getOldStackUrl,
    handleNavigation,
    replaceBrowserLocation,
  };
};
