import { useWhyLabsBreadCrumbsFactory } from '~/components/design-system/bread-crumbs/useWhyLabsBreadCrumbsFactory';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { usePagingInfo } from '~/hooks/usePagingInfo';
import useSearchText from '~/hooks/useSearchText';
import useSort from '~/hooks/useSort';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { useLlmTraceViolationTags } from '~/routes/:orgId/:resourceId/llm-trace/hooks/useLlmTraceViolationTags';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { getAcknowledgeStatus } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { stringToSecurePathMap } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { LoaderData } from '~/types/LoaderData';
import { SortByKeys, SortDirectionKeys } from '~/types/sortTypes';
import { CURRENT_FILTER, FILTERED_TRACES, SELECTED_ORG_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { ModelType } from '~server/graphql/generated/graphql';
import { TracesSortBy } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { useLlmTraceDateRangeParams } from '../hooks/useLlmTraceDateRangeParams';

// Auto refetch traces interval in milliseconds
const REFETCH_INTERVAL = 15_000_000;

export const loader = (({ params, request }) => {
  const { orgId, resourceId, traceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');
  const isEmbeddingsProjector = request.url.includes(`/${AppRoutePaths.resourceIdLlmTracesEmbeddingsProjector}`);

  return { orgId, resourceId, traceId, isEmbeddingsProjector };
}) satisfies LoaderFunction;

export function useLlmTraceViewModel() {
  const { backToMainStackURL } = useWhyLabsSearchParams();
  const {
    orgId,
    resourceId,
    traceId: selectedTraceId,
    isEmbeddingsProjector,
  } = useLoaderData() as LoaderData<typeof loader>;
  const { sortBy, sortDirection } = useSort<TracesSortBy>({
    sortByKey: SortByKeys.sortTracesBy,
    sortDirectionKey: SortDirectionKeys.sortTracesDirection,
  });
  const {
    composedFilters,
    embeddingsProjector: { displayWarningModalState },
  } = useLlmSecureContext();
  const { handleNavigation } = useNavLinkHandler();
  const { orgCrumb, resourceCrumb } = useWhyLabsBreadCrumbsFactory();
  const llmSecurePath = stringToSecurePathMap.get('traces');

  const { searchText, setSearchText } = useSearchText();
  const { isLoading: loadingDateRange, fromTimestamp, toTimestamp } = useLlmTraceDateRangeParams({ orgId, resourceId });

  const {
    pagingInfo: { limit, offset },
    setPage,
  } = usePagingInfo({ customLimit: 100 });

  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({
    displayLabelAs: 'nameAndId',
    filterByType: ModelType.Llm,
  });

  const commonQuery = { orgId, resourceId };
  const isQueryEnabled = !loadingDateRange && !composedFilters?.loading;
  const { data, dataUpdatedAt, isLoading } = trpc.meta.llmTrace.list.useQuery(
    {
      ...commonQuery,
      composedFilters: composedFilters.filters,
      fromTimestamp,
      offset,
      limit,
      searchTerm: searchText,
      sortBy,
      sortDirection,
      toTimestamp,
    },
    {
      enabled: isQueryEnabled,
      refetchInterval: REFETCH_INTERVAL,
      // refetchOnWindowFocus: 'never',
    },
  );

  if (data && !data?.list?.length && !isLoading && offset !== 0) {
    setPage(0);
  }

  const violationTags = useLlmTraceViolationTags(orgId, resourceId);

  const { data: lineageData, isLoading: isLoadingLineage } = trpc.meta.llmTrace.getLineage.useQuery(commonQuery, {
    enabled: isQueryEnabled,
  });

  const list = data?.list ?? [];

  const onSelectCompletionId = (id: string) => {
    const item = list.find((t) => t.id === id);
    if (!item) return;
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: llmSecurePath ?? 'traces', traceId: item.traceId, traceItem: id },
    });
  };

  const onSelectTrace = (id: string) => {
    if (selectedTraceId === id) return;
    handleNavigation({ page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces', traceId: id } });
  };

  const onSelectPreviousTrace = () => {
    const index = getIndexForSelectedTrace();
    if (index < 0) return;

    const previousTrace = list[index - 1];
    if (previousTrace) onSelectTrace(previousTrace.id);
  };

  const onSelectNextTrace = () => {
    const index = getIndexForSelectedTrace();
    if (index < 0) return;

    const nextTrace = list[index + 1];
    if (nextTrace) onSelectTrace(nextTrace.id);
  };

  const getIndexForSelectedTrace = () => {
    if (!selectedTraceId) return -1;
    return list.findIndex((t) => t.id === selectedTraceId);
  };

  const unselectTrace = () => {
    handleNavigation({ page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces' } });
  };

  function onClosePage() {
    window.location.href =
      backToMainStackURL ||
      `${window.location.origin}/resources/${resourceId}/summary?${SELECTED_ORG_QUERY_NAME}=${orgId}`;
  }

  const onChangeResource = (newResource: string | null) => {
    if (newResource) {
      handleNavigation({ resourceId: newResource, page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces' } });
    }
  };

  const onClickOpenEmbeddingsProjector = () => {
    if (!getAcknowledgeStatus()) {
      displayWarningModalState.setter(true);
      return;
    }
    displayWarningModalState.setter(false);
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces', page: 'embeddings-projector' },
      saveParams: [CURRENT_FILTER, FILTERED_TRACES],
    });
  };

  return {
    breadcrumbs: { orgCrumb, resourceCrumb },
    lineage: {
      data: lineageData,
      isLoading: isLoadingLineage,
    },
    trace: {
      isLoading,
      list,
      totalCount: data?.totalCount ?? 0,
      totalWithCoords: data?.totalCountWithCoords ?? 0,
      updatedAt: dataUpdatedAt,
    },
    onClosePage,
    onChangeResource,
    onSelectCompletionId,
    onSelectNextTrace,
    onSelectPreviousTrace,
    onClickOpenEmbeddingsProjector,
    onSelectTrace,
    resourceId,
    resources: {
      data: resourcesList,
      isLoading: isResourcesLoading,
    },
    searchText,
    selectedTraceId,
    setSearchText,
    unselectTrace,
    violationTags,
    isEmbeddingsProjector,
  };
}
