import { Pages, PageType, PageTypePairs } from 'pages/page-types/pageType';
import { matchRoutes, useLocation, useSearchParams } from 'react-router-dom';
import { PROFILE_REPORT, PROFILE_TAG, SEGMENT_KEY_TAG, SEGMENT_VALUE_TAG } from 'types/navTags';
import { useDeepCompareMemo } from 'use-deep-compare';
import { parseParams, UniversalPageParams } from './pageUrlQuery';

const PAGES_LIST = Object.values(Pages).map((path) => ({ path }));

/**
 * Utility hook to get a hold of the page type.
 * This is useful for components that are shared across multiple pages.
 * @returns the page type
 * @example
 * const pageType = usePageType();
 * if (pageType === 'dashboard') // Do something
 * @see PageType
 * @see PageTypePairs
 */
export function usePageType(): PageType {
  const match = useRouteMatch();

  const pageMatch = PageTypePairs.find(([, pagePath]) => {
    return pagePath === match?.route.path;
  });

  // We default to the dashboard page when nothing matches the route
  return (pageMatch && pageMatch[0]) || 'dashboard';
}

/**
 * Utility hook to get a hold of the page type along with the url params it
 * is expected to have.
 */
export function usePageTypeWithParams(): UniversalPageParams {
  const pageType = usePageType();
  const [searchParams] = useSearchParams();
  const match = useRouteMatch();

  const urlParams = match ? match.params : {};

  const profiles = searchParams.getAll(PROFILE_TAG);
  const keys = searchParams.getAll(SEGMENT_KEY_TAG);
  const values = searchParams.getAll(SEGMENT_VALUE_TAG);
  const profileReport = searchParams.get(PROFILE_REPORT);
  // This useDeepCompareMemo fixes infinity re-render hells on this hook usage -- usually experienced with non-primitive types i.e. Array, Objects like segments
  return useDeepCompareMemo(
    () =>
      parseParams(urlParams, pageType, {
        profiles,
        segmentKeys: keys,
        segmentValues: values,
        profileReport,
      }),
    [urlParams, pageType, profiles, keys, values, profileReport],
  );
}

function useRouteMatch() {
  const location = useLocation();

  const match = useDeepCompareMemo(() => matchRoutes(PAGES_LIST, location), [location]);
  return match?.[0];
}

export function getParam(param: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(param)) {
    return urlParams.get(param);
  }
  return null;
}

export function getParams(param: string): string[] | null {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(param)) {
    return urlParams.getAll(param);
  }
  return null;
}
