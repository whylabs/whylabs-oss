import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ParsedSegment, simpleStringifySegment, UniversalQuery } from 'pages/page-types/pageUrlQuery';
import { cherryPickQueryString, cleanupQueryString, removeKeys } from 'utils/queryCleaner';
import {
  ACTION_STATE_TAG,
  ANALYZER_FILTER,
  COMPARE_KEY,
  CORRELATED_SECTION_TAGS,
  LEGACY_DATE_RANGE_TAG,
  EDITING_KEY,
  FILTER_KEYS,
  LLM_BATCH_PARAMS,
  MONITOR_KEY,
  NEW_GLOBAL_DATE_PICKER_PARAMS,
  PAGING_TAGS,
  PROFILE_KEYS,
  PROFILE_REPORT,
  SEGMENT_ANALYSIS_KEYS,
  SEGMENT_TYPE_KEYS,
  SELECTED_TIMESTAMP,
  SUPER_PICKER_TEMP_PARAMS,
  VIEW_TYPE_KEYS,
  CURRENT_FILTER,
} from 'types/navTags';
import { PageBases, Pages } from 'pages/page-types/pageType';
import { hackEncodeURIComponent } from 'utils/hackEncodeURIComponent';
import { BASE_LOGIN_URI, BASE_LOGOUT_URI, DASHBIRD_URI } from 'ui/constants';
import { ActionRoutePath } from 'pages/settings-pages/notifications/globalActionUtils';
import { TARGET_ORG_QUERY_NAME } from '../graphql/apollo';

type SettingPath = 'notifications' | 'access-tokens' | 'integrations' | 'model-management' | 'user-management';
type SettingsProps = {
  path?: SettingPath;
  id?: string;
  actionType?: ActionRoutePath;
};
const getSettingsRoute = (baseUrl: string, searchString: string, props?: SettingsProps) => {
  const url = `/settings`;
  const newSearchString = removeKeys([COMPARE_KEY], searchString);
  if (!props) return url.concat(newSearchString);
  const { path, id, actionType } = props;
  if (path === 'notifications' && actionType && id) {
    const encodedId = hackEncodeURIComponent(id);
    return `${url}/${path}/${actionType}/${encodedId}`.concat(newSearchString);
  }

  return `${url}/${path}`.concat(newSearchString);
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
const getMonitorManagerRoute = (baseUrl: string, searchString: string, props?: MonitorManagerProps) => {
  let url = `${baseUrl}/monitor-manager`;
  const newSearchString = removeKeys([COMPARE_KEY], searchString);
  if (!props) return url.concat(newSearchString);
  const { path, id } = props;
  const encodedId = hackEncodeURIComponent(id ?? '');
  url = encodedId ? `${url}/${path}/${encodedId}` : `${url}/${path}`;
  return `${url}`.concat(newSearchString);
};

export type LLMDashboardsPath = 'security' | 'performance' | 'segment-analysis' | ':dashboardId';
type LLMDashboardsProps = {
  path: LLMDashboardsPath;
};
const getResourceDashboardsRoute = (baseUrl: string, dashboardId?: string, segment?: ParsedSegment) => {
  let url = `${baseUrl}`;
  if (segment?.tags?.length) {
    url = url.concat(`/segments/${simpleStringifySegment(segment)}`);
  }

  if (dashboardId) return `${url}/${dashboardId}`;
  return url;
};

const getLLMDashboardsRoute = (baseUrl: string, props?: LLMDashboardsProps, segment?: ParsedSegment) => {
  let url = `${baseUrl}`;
  if (segment?.tags?.length) {
    url = url.concat(`/segments/${simpleStringifySegment(segment)}`);
  }
  url = url.concat('/dashboards');
  const { path } = props ?? {};
  if (path) {
    return `${url}/${path}`;
  }
  return url;
};

const BASE_ROUTES = [
  'notFound',
  'settings',
  'executive',
  'modelsSummary',
  'datasetsSummary',
  'customDashboards',
  'getStarted',
] as const;
const MODEL_ROUTES = [
  'home',
  'columns',
  'explainability',
  'dashboards',
  ':dashboardId',
  'monitorManager',
  'output',
  'profiles',
  'summary',
  'segments',
  'performance',
  'segment-analysis',
  'featureComparison',
  'segmentFeatureComparison',
  'constraints',
] as const;
export type ModelRoutes = typeof MODEL_ROUTES[number];
const ALL_SUPPORTED_ROUTES = [...BASE_ROUTES, ...MODEL_ROUTES] as const;
export type SupportedRoute = typeof ALL_SUPPORTED_ROUTES[number];
// Never include a new param in both arrays, choose one based on you need
const StickyParams = [TARGET_ORG_QUERY_NAME, ...SEGMENT_TYPE_KEYS, ...NEW_GLOBAL_DATE_PICKER_PARAMS] as const;
const AutoRemovedParams = [
  EDITING_KEY,
  ACTION_STATE_TAG,
  SELECTED_TIMESTAMP,
  MONITOR_KEY,
  ANALYZER_FILTER,
  LEGACY_DATE_RANGE_TAG, // dropping legacy date picker param
  PROFILE_REPORT,
  CURRENT_FILTER,
  ...LLM_BATCH_PARAMS,
  ...PROFILE_KEYS,
  ...PAGING_TAGS,
  ...FILTER_KEYS,
  ...VIEW_TYPE_KEYS,
  ...CORRELATED_SECTION_TAGS,
  ...SUPER_PICKER_TEMP_PARAMS,
  ...SEGMENT_ANALYSIS_KEYS,
] as const;

/* The params in StickyParams are not auto removed, but they can be removed using ignoreOldQueryString param.
  To make it always preserved add in the ForcedStickyParams array */
export const ForcedStickyParams = [TARGET_ORG_QUERY_NAME] as const;

export const getSupportedRoute = (route: string): SupportedRoute => {
  const foundRoute = ALL_SUPPORTED_ROUTES.find((r): r is SupportedRoute => r === route);
  return foundRoute || 'summary';
};

type RemovableQueryParams = typeof AutoRemovedParams[number];
export type QueryParams = RemovableQueryParams | typeof StickyParams[number];
type SaveParams = Array<RemovableQueryParams>;
export type NavHandlerSearchParams = { name: QueryParams; value: string | string[] }[];
interface NavigationParams {
  page: SupportedRoute;
  settings?: SettingsProps;
  modelId?: string;
  featureName?: string;
  ignoreOldQueryString?: boolean;
  monitorManager?: MonitorManagerProps;
  dashboardId?: string;
  dashboards?: LLMDashboardsProps;
  segmentTags?: ParsedSegment;
  saveParams?: SaveParams;
  setParams?: NavHandlerSearchParams;
}
interface SwitchModelParams {
  keepOldPath: true;
  modelId: string;
  saveParams?: SaveParams;
  setParams?: NavHandlerSearchParams;
  ignoreOldQueryString?: boolean;
}

export type UniversalNavigationParams = NavigationParams | SwitchModelParams;

type NavLinkHandlerReturnType = {
  getNavUrl(props: UniversalNavigationParams): string;
  getNavUrlWithoutOrg(props: UniversalNavigationParams): string;
  handleNavigation(props: UniversalNavigationParams): void;
  handleNavigationWithoutOrg(props: UniversalNavigationParams): void;
};

type OldPathDataType = {
  pathname: string;
  modelId?: string;
};
const getHomeUrl = (modelId: string) => `${PageBases.resources}/${modelId}`;

export const SEGMENT_ROUTES: ModelRoutes[] = [
  'columns',
  'performance',
  'output',
  'profiles',
  'segmentFeatureComparison',
  'dashboards',
  'constraints',
];
const getModelUrl = (baseUrl: string, page: ModelRoutes, segment?: ParsedSegment, featureName = '') => {
  let url = baseUrl;
  if (segment?.tags?.length && SEGMENT_ROUTES.includes(page)) {
    url = `${url}/segments/${simpleStringifySegment(segment)}`;
  }
  const isFeaturePage = ['output', 'columns', 'featureComparison', 'segmentFeatureComparison'].includes(page);
  const isComparison = ['featureComparison', 'segmentFeatureComparison'].includes(page);
  const encodedFeature = hackEncodeURIComponent(featureName);

  const featurePath = isFeaturePage && isComparison ? 'columns' : page;
  const outputUrl = `${url}/${featurePath}`
    .concat(isFeaturePage && encodedFeature ? `/${encodedFeature}` : '')
    .concat(isComparison ? `/${COMPARE_KEY}` : '');
  return outputUrl;
};

const getSamePageUrl = (modelId: string, oldPathData?: OldPathDataType) => {
  if (!oldPathData?.modelId || !oldPathData?.pathname) {
    return getHomeUrl(modelId);
  }
  const regexMatch = RegExp(`${oldPathData.modelId}`); // No global flag so it only matches first model it finds
  return `${oldPathData.pathname.replace(regexMatch, modelId)}`;
};

export const handleSetParams = (
  setParams: UniversalNavigationParams['setParams'],
  usedSearchString: string,
): string => {
  const urlParams = new URLSearchParams(usedSearchString);
  setParams?.forEach(({ name, value }) => {
    if (Array.isArray(value)) {
      value.forEach((param) => urlParams.append(name, param));
    } else {
      urlParams.set(name, value);
    }
  });
  const newSearchString = urlParams.toString();
  return newSearchString ? `?${newSearchString}` : '';
};

const handleSearchString = (foundSearchString: string, ignoreOldQueryString = false): string => {
  if (ignoreOldQueryString) {
    return cleanupQueryString({ keysToKeep: [...ForcedStickyParams], queryString: foundSearchString });
  }
  return cherryPickQueryString({ keysToRemove: [], queryString: foundSearchString });
};

export function generateNavUrl(
  params: UniversalNavigationParams,
  foundSearchString: string,
  oldPathData?: OldPathDataType,
): string {
  const { ignoreOldQueryString, modelId, setParams } = params;
  const searchString = handleSearchString(foundSearchString, ignoreOldQueryString);
  const usedSearchString = handleSetParams(setParams, searchString);
  if ('keepOldPath' in params) {
    return getSamePageUrl(modelId ?? '', oldPathData).concat(usedSearchString);
  }

  const {
    page,
    settings,
    featureName, // Note that this can be an input or output feature name
    monitorManager,
    segmentTags,
    dashboardId,
    dashboards,
  } = params;

  const invalidParams = !BASE_ROUTES.find((p) => p === page) && !modelId;
  const newPage = invalidParams ? 'home' : page;
  const baseUrl = `${PageBases.resources}/${modelId}`;
  switch (newPage) {
    case 'notFound':
      return `${Pages.notFound}${usedSearchString}`;
    case 'home':
      return `${PageBases.resources}${usedSearchString}`;
    case 'executive':
    case 'getStarted':
    case 'modelsSummary':
    case 'customDashboards':
    case 'datasetsSummary':
      return `${Pages[newPage]}${usedSearchString}`;
    case 'settings':
      return getSettingsRoute(baseUrl, usedSearchString, settings);
    case 'monitorManager':
      return getMonitorManagerRoute(baseUrl, usedSearchString, monitorManager);
    case ':dashboardId':
      return `${getResourceDashboardsRoute(baseUrl, dashboardId, segmentTags)}${usedSearchString}`;
    case 'dashboards':
      return `${getLLMDashboardsRoute(baseUrl, dashboards, segmentTags)}${usedSearchString}`;
    default:
      return getModelUrl(baseUrl, newPage, segmentTags, featureName).concat(usedSearchString);
  }
}

const routeStickyParamsMap = new Map<SupportedRoute, RemovableQueryParams[]>([
  ['monitorManager', ['filterByAnalyzer', 'monitor']],
  [
    'segment-analysis',
    [
      'metricsPreset',
      'primaryMetric',
      'secondaryMetric',
      'tempStart',
      'tempEnd',
      'tempPreset',
      'comparison',
      'threshold',
    ],
  ],
]);

const getUrlParamsToRemove = (saveParams?: SaveParams): RemovableQueryParams[] => {
  const saveKeys: Set<RemovableQueryParams> = new Set(saveParams);
  return AutoRemovedParams.filter((k) => !!k && !saveKeys.has(k));
};

const getParamsToSave = ({ page, saveParams }: NavigationParams) => {
  const params = routeStickyParamsMap.get(page) ?? [];
  if (saveParams) params.push(...saveParams);
  return params;
};

/**
 * A universal navigation link handling hook that will eventually replace all of the others in this file.
 *
 * @param saveParams Whether avoid removeKeys to remove some query parameters
 * @returns A function to get a nav URL from a set of parameters and another function to simply navigate there on invocation.
 */
export const useNavLinkHandler = (): NavLinkHandlerReturnType => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const { modelId } = useParams<UniversalQuery>();

  const getSearchString = (saveParams?: SaveParams) => {
    return search ? removeKeys(getUrlParamsToRemove(saveParams), search) : '';
  };

  function getNavUrl(params: UniversalNavigationParams): string {
    const saveParams = (() => {
      if ('page' in params) return getParamsToSave(params);
      return [];
    })();
    const searchString = getSearchString(saveParams);
    return generateNavUrl(params, searchString, { pathname, modelId });
  }

  function getNavUrlWithoutOrg(params: UniversalNavigationParams): string {
    const searchString = removeKeys([TARGET_ORG_QUERY_NAME], getSearchString(params.saveParams));
    return generateNavUrl(params, searchString, { pathname, modelId });
  }

  function handleNavigation(props: UniversalNavigationParams): void {
    navigate(getNavUrl(props));
  }

  function handleNavigationWithoutOrg(props: UniversalNavigationParams): void {
    navigate(getNavUrlWithoutOrg(props));
  }

  return { getNavUrl, getNavUrlWithoutOrg, handleNavigation, handleNavigationWithoutOrg };
};

interface SearchHandlerReturnType {
  getSimpleValue(key: string): string | null;
  getArrayValue(key: string): string[];
  setSimpleValue(key: string, value: string, shouldPush?: boolean): void;
  setArrayValue(key: string, value: string[], shouldPush?: boolean): void;
  deleteKey(key: string, shouldPush?: boolean): void;
}
export const useSearchHandler = (): SearchHandlerReturnType => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const parsedSearch = new URLSearchParams(search);

  function getSimpleValue(key: string): string | null {
    return parsedSearch.get(key);
  }

  function pushOrReplace(urlSearch: URLSearchParams, shouldPush: boolean): void {
    if (shouldPush) {
      navigate({
        search: urlSearch.toString(),
      });
    } else {
      navigate(
        {
          search: urlSearch.toString(),
        },
        { replace: true },
      );
    }
  }

  function setSimpleValue(key: string, value: string, shouldPush = false): void {
    parsedSearch.set(key, value);
    pushOrReplace(parsedSearch, shouldPush);
  }

  function getArrayValue(key: string): string[] {
    return parsedSearch.getAll(key);
  }

  function setArrayValue(key: string, values: string[], shouldPush = false): void {
    if (values.length === 0) {
      deleteKey(key, shouldPush);
      return;
    }
    values.forEach((val, idx) => {
      if (idx === 0) {
        parsedSearch.set(key, val);
      } else {
        parsedSearch.append(key, val);
      }
    });
    pushOrReplace(parsedSearch, shouldPush);
  }

  function deleteKey(key: string, shouldPush = false): void {
    parsedSearch.delete(key);
    pushOrReplace(parsedSearch, shouldPush);
  }

  return {
    getSimpleValue,
    getArrayValue,
    setSimpleValue,
    setArrayValue,
    deleteKey,
  } as const;
};

type LoginOptions = {
  // if true, user will be redirected back to their original location in the app after logging in
  preserveLocation?: boolean;
};

export function useAuthNavigationHandler(): {
  // triggers the login flow by redirecting the user to /login
  triggerLogin: (LoginOptions?: LoginOptions) => void;
  // triggers the logout flow by redirecting the user to /logout
  triggerLogout: () => void;
  // returns the login URI
  getLoginUri: () => string;
  // returns the logout URI
  getLogoutUri: () => string;
} {
  const loginUri = `${DASHBIRD_URI}/${BASE_LOGIN_URI}`;
  const logoutUri = `${DASHBIRD_URI}/${BASE_LOGOUT_URI}`;

  return {
    getLoginUri: () => loginUri,
    triggerLogin: (opts?: LoginOptions) => {
      const { preserveLocation } = opts ?? {};

      // must trigger browser navigation to the login url for it to work properly
      window.location.href = preserveLocation
        ? `${loginUri}?redirectUri=${encodeURIComponent(window.location.href)}`
        : loginUri;
    },
    getLogoutUri: () => logoutUri,
    triggerLogout: () => {
      // must trigger browser navigation to the logout url for it to work properly
      window.location.href = logoutUri;
    },
  };
}
