import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { removeKeys } from '~/utils/queryCleaner';
import { PAGING_TAGS, STICKY_PARAMS, TEMP_PARAMS } from '~/utils/searchParamsConstants';

const BASE_ROUTES = [
  'home',
  // 'notFound', TODO: add 404 route
  'resources',
] as const;
const RESOURCE_ROUTES = ['llm-secure'] as const;
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
  llmSecure?: LLMSecureProps;
  saveParams?: SaveParams;
  setParams?: NavHandlerSearchParams;
}

type LLMSecureTraceProps = {
  path: 'traces' | 'completions';
  traceId?: string;
  traceItem?: string;
  page?: 'embeddings-projector';
};
type LLMSummaryProps = {
  path: 'summary';
};
type LLMSecurePolicyProps = {
  path: 'policy';
  page?: 'callback-settings' | 'advanced-settings' | 'change-history';
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
  if (props.path === 'traces' || props.path === 'completions') {
    url = url.concat(`/${props.path}`);
    const { traceId, traceItem } = props;
    if (!traceId) return url.concat(searchString);
    url = url.concat(`/${traceId}`);
    if (!traceItem) return url.concat(searchString);
    return url.concat(`/${traceItem}`).concat(searchString);
  }
  return url.concat(searchString);
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

export function generateNavUrl(params: UniversalNavigationParams, foundSearchString: string): string {
  const { ignoreOldQueryString, resourceId, setParams, page, llmSecure } = params;
  const searchString = ignoreOldQueryString ? '' : foundSearchString;
  const usedSearchString = handleSetParams(setParams, searchString);
  const isBaseRoute = BASE_ROUTES.find((p) => p === page);
  const invalidParams = !isBaseRoute && !resourceId;
  const newPage = invalidParams ? 'invalid' : page;
  const baseUrl = `${resourceId && !isBaseRoute ? `/${resourceId}` : ''}`;

  switch (newPage) {
    case 'home':
      return `${baseUrl}/${AppRoutePaths.resourcesSummary}${usedSearchString}`;
    // case 'notFound': TODO 404 page
    //   return `${Pages.notFound}${usedSearchString}`;
    case 'llm-secure':
      return getLLMSecureRoute(baseUrl, usedSearchString, llmSecure);
    case 'resources':
      return baseUrl.concat(`/${AppRoutePaths.resourcesSummary}${usedSearchString}`);
    case 'invalid':
    default:
      // let's just do nothing if we have an invalid link... force to back to ui-exp sounds very dramatic
      return window.location.href.replace(window.location.origin, '');
  }
}

const routeStickyParamsMap = new Map<SupportedRoute, RemovableQueryParams[]>([
  ['llm-secure', ['filter', 'filterTraceId', 'selectedAllTraces', ...PAGING_TAGS]],
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
 */
export const useNavLinkHandler = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { resourceId } = useParams<{ resourceId?: string }>();
  const getSearchString = (saveParams?: SaveParams) => {
    return search ? removeKeys(getUrlParamsToRemove(saveParams), search) : '';
  };

  function getNavUrl({ resourceId: manualResourceId, ...props }: UniversalNavigationParams): string {
    const saveParams = getParamsToSave(props);
    const searchString = getSearchString(saveParams);
    return generateNavUrl({ ...props, resourceId: manualResourceId || resourceId }, searchString);
  }

  function handleNavigation(props: UniversalNavigationParams): void {
    const path = getNavUrl(props);
    navigate(path);
  }

  return {
    search,
    getNavUrl,
    handleNavigation,
  };
};
