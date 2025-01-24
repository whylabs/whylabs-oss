import { useDebouncedState } from '@mantine/hooks';
import { LoaderFunction, redirect, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useComposedFilter } from '~/hooks/composed-filter/useComposedFilter';
import { useResourcesSelectorData } from '~/hooks/useResourcesSelectorData';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useMarkedTracesSearchParams } from '~/routes/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';
import { dimensionOptions } from '~/routes/:resourceId/llm-trace/traces/components/utils';
import { LLM_TRACE_TABS_LIST, stringToSecurePathMap } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { ReadyToQueryFilter } from '~server/trpc/util/composedFilterSchema';

export const loader = (({ params, request }) => {
  const { resourceId, tabId } = params;
  invariant(resourceId, 'resourceId must exist in this route');
  const selectedTab = (() => {
    if (tabId) return tabId;
    if (request.url.includes(`/${AppRoutePaths.resourceIdLlmTracePolicy}`))
      return AppRoutePaths.resourceIdLlmTracePolicy;
    if (request.url.includes(`/${AppRoutePaths.resourceIdLlmTraceSummary}`))
      return AppRoutePaths.resourceIdLlmTraceSummary;

    return null;
  })();

  // Redirect to the default tab if the selected tab is not in the list
  if (selectedTab && !LLM_TRACE_TABS_LIST.includes(selectedTab)) {
    const url = new URL(request.url);
    return redirect(`/${resourceId}/${AppRoutePaths.resourceIdLlmTrace}${url.search}`);
  }

  return { resourceId, selectedTab };
}) satisfies LoaderFunction;

export function useLlmTraceLayoutViewModel() {
  const { handleNavigation, getNavUrl } = useNavLinkHandler();
  const { clearMarkedTracesParams } = useMarkedTracesSearchParams();
  const { resourceId, selectedTab } = useLoaderData() as LoaderData<typeof loader>;
  const [composedFilters, setComposedFilters] = useDebouncedState<ReadyToQueryFilter[] | undefined>(undefined, 500, {
    leading: true,
  });
  const composedFilterAtom = useComposedFilter({
    dimensionOptions,
    onChange: setComposedFilters,
    handleAdditionalSearchParams: clearMarkedTracesParams,
  });

  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({
    displayLabelAs: 'nameAndId',
  });

  const onChangeResource = (newResource: string | null) => {
    if (newResource) {
      const path = stringToSecurePathMap.get(selectedTab ?? '');
      handleNavigation({ resourceId: newResource, page: 'llm-secure', llmSecure: { path: path ?? 'traces' } });
    }
  };

  const onChangeTab = (tab: string) => {
    const path = stringToSecurePathMap.get(tab);
    handleNavigation({ page: 'llm-secure', llmSecure: { path: path ?? 'traces' } });
  };

  return {
    onChangeResource,
    onChangeTab,
    resourceId,
    resources: {
      data: resourcesList,
      isLoading: isResourcesLoading,
    },
    selectedTab,
    composedFilters: {
      filters: composedFilters ?? [],
      loading: !composedFilters,
    },
    composedFilterAtom,
    getNavUrl,
  };
}
