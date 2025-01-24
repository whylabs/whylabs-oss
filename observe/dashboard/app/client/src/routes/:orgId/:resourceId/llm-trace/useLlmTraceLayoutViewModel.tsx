import { useWhyLabsBreadCrumbsFactory } from '~/components/design-system/bread-crumbs/useWhyLabsBreadCrumbsFactory';
import { useComposedFilter } from '~/hooks/composed-filter/useComposedFilter';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { EmbeddingsSpace } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { useMarkedTracesSearchParams } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';
import { dimensionOptions } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { LLM_TRACE_TABS_LIST, stringToSecurePathMap } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { SELECTED_EMBEDDINGS_SPACE, SELECTED_ORG_QUERY_NAME } from '~/utils/searchParamsConstants';
import { ModelType } from '~server/graphql/generated/graphql';
import { useState } from 'react';
import { LoaderFunction, redirect, useLoaderData, useSearchParams } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (({ params, request }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');
  const selectedTab = (() => {
    if (request.url.includes(`/${AppRoutePaths.resourceIdLlmTracePolicy}`))
      return AppRoutePaths.resourceIdLlmTracePolicy;
    if (request.url.includes(`/${AppRoutePaths.resourceIdLlmTraceSummary}`))
      return AppRoutePaths.resourceIdLlmTraceSummary;
    if (request.url.includes(`/${AppRoutePaths.resourceIdLlmTraceTab}`)) return AppRoutePaths.resourceIdLlmTraceTab;
    return null;
  })();

  const isEmbeddingsProjector = request.url.includes(`/${AppRoutePaths.resourceIdLlmTracesEmbeddingsProjector}`);

  // Redirect to the default tab if the selected tab is not in the list
  if (selectedTab && !LLM_TRACE_TABS_LIST.includes(selectedTab)) {
    const url = new URL(request.url);
    return redirect(`/${orgId}/${resourceId}/${AppRoutePaths.resourceIdLlmTrace}${url.search}`);
  }

  return { orgId, resourceId, selectedTab, isEmbeddingsProjector };
}) satisfies LoaderFunction;

export function useLlmTraceLayoutViewModel() {
  const { backToMainStackURL, globalPickerSearchString } = useWhyLabsSearchParams();
  const { handleNavigation, getNavUrl } = useNavLinkHandler();
  const [searchParams] = useSearchParams();
  const { clearMarkedTracesParams } = useMarkedTracesSearchParams();
  const { orgId, resourceId, selectedTab, isEmbeddingsProjector } = useLoaderData() as LoaderData<typeof loader>;

  const composedFilterAtom = useComposedFilter({
    dimensionOptions,
    handleAdditionalSearchParams: clearMarkedTracesParams,
  });

  const { orgCrumb, resourceCrumb } = useWhyLabsBreadCrumbsFactory();

  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({
    displayLabelAs: 'nameAndId',
    filterByType: ModelType.Llm,
  });

  function onClosePage() {
    if (isEmbeddingsProjector) {
      handleNavigation({ page: 'llm-secure', llmSecure: { path: 'traces' } });
      return;
    }
    window.location.href =
      backToMainStackURL ||
      `${window.location.origin}/resources/${resourceId}/summary?${SELECTED_ORG_QUERY_NAME}=${orgId}&${globalPickerSearchString}`;
  }

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

  const [fetchedEmbeddingsSpaceVersions, setFetchedEmbeddingsSpaceVersions] = useState<Map<
    string,
    EmbeddingsSpace
  > | null>(null);
  const selectedSpaceVersion: EmbeddingsSpace | null = (() => {
    if (fetchedEmbeddingsSpaceVersions?.size === 1)
      return fetchedEmbeddingsSpaceVersions.values()?.next()?.value ?? null;
    const persistedMajorVersion = searchParams.get(SELECTED_EMBEDDINGS_SPACE);
    if (!persistedMajorVersion) return null;
    return fetchedEmbeddingsSpaceVersions?.get(persistedMajorVersion) || null;
  })();
  const [spaceModalIsOpen, setSpaceModalIsOpen] = useState<boolean | undefined>();

  const [showContentWarningModal, setShowContentWarningModal] = useState<boolean>(false);

  const { isLoadingFilters, debouncedReadyToQueryFilters } = composedFilterAtom;

  return {
    breadcrumbs: { orgCrumb, resourceCrumb },
    onClosePage,
    onChangeResource,
    onChangeTab,
    resourceId,
    orgId,
    resources: {
      data: resourcesList,
      isLoading: isResourcesLoading,
    },
    selectedTab,
    composedFilters: {
      filters: debouncedReadyToQueryFilters,
      loading: isLoadingFilters,
    },
    composedFilterAtom,
    getNavUrl,
    isEmbeddingsProjector,
    embeddingsProjector: {
      selectedSpaceVersion,
      spaceVersionsState: {
        value: fetchedEmbeddingsSpaceVersions,
        setter: setFetchedEmbeddingsSpaceVersions,
      },
      modalIsOpenState: {
        value: spaceModalIsOpen,
        setter: setSpaceModalIsOpen,
      },
      displayWarningModalState: {
        value: showContentWarningModal,
        setter: setShowContentWarningModal,
      },
    },
  };
}
