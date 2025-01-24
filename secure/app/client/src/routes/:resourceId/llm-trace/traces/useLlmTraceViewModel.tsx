import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { usePagingInfo } from '~/hooks/usePagingInfo';
import { useResourcesSelectorData } from '~/hooks/useResourcesSelectorData';
import useSort from '~/hooks/useSort';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useLlmSecureContext } from '~/routes/:resourceId/llm-trace/LlmTraceLayout';
import { stringToSecurePathMap } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { LoaderData } from '~/types/LoaderData';
import { CURRENT_FILTER, FILTERED_TRACES } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { TracesSortBy } from '~server/types/api';

import { useLlmTraceDateRangeParams } from '../hooks/useLlmTraceDateRangeParams';

// Auto refetch traces interval in milliseconds
const REFETCH_INTERVAL = 15_000_000;

export const loader = (({ params }) => {
  const { resourceId, tabId, traceId } = params;
  invariant(resourceId, 'resourceId must exist in this route');
  invariant(tabId, 'tabId must exist in this route');

  return { resourceId, tabId, traceId };
}) satisfies LoaderFunction;

export function useLlmTraceViewModel() {
  const { resourceId, tabId, traceId: selectedTraceId } = useLoaderData() as LoaderData<typeof loader>;
  const { sortBy, sortDirection } = useSort<TracesSortBy>();
  const { composedFilters } = useLlmSecureContext();
  const { handleNavigation } = useNavLinkHandler();
  const llmSecurePath = stringToSecurePathMap.get(tabId);

  const { isLoading: loadingDateRange, fromTimestamp, toTimestamp } = useLlmTraceDateRangeParams({ resourceId });

  const {
    pagingInfo: { limit, offset },
  } = usePagingInfo({ customLimit: 100 });

  const { isLoading: isResourcesLoading, resourcesList } = useResourcesSelectorData({
    displayLabelAs: 'nameAndId',
  });

  const commonQuery = { resourceId };
  const isQueryEnabled = !loadingDateRange && !composedFilters?.loading;
  const { data, dataUpdatedAt, isLoading } = trpc.meta.llmTrace.list.useQuery(
    {
      ...commonQuery,
      composedFilters: composedFilters.filters,
      fromTimestamp,
      offset,
      limit,
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

  const { data: lineageData, isLoading: isLoadingLineage } = trpc.meta.llmTrace.getLineage.useQuery(commonQuery, {
    enabled: isQueryEnabled,
  });

  const { data: violationTagsData, isLoading: isLoadingViolationTags } = trpc.meta.llmTrace.getViolationTags.useQuery(
    {
      ...commonQuery,
      fromTimestamp: lineageData?.start ?? fromTimestamp,
      toTimestamp: lineageData?.end ?? toTimestamp,
    },
    {
      enabled: isQueryEnabled,
    },
  );

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

  const onChangeResource = (newResource: string | null) => {
    if (newResource) {
      handleNavigation({ resourceId: newResource, page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces' } });
    }
  };

  const onClickOpenEmbeddingsProjector = () => {
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces', page: 'embeddings-projector' },
      saveParams: [CURRENT_FILTER, FILTERED_TRACES],
    });
  };

  return {
    lineage: {
      data: lineageData,
      isLoading: isLoadingLineage,
    },
    trace: {
      isLoading,
      list,
      totalCount: data?.totalCount ?? 0,
      updatedAt: dataUpdatedAt,
    },
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
    selectedTab: tabId,
    selectedTraceId,
    unselectTrace,
    violationTags: {
      data: violationTagsData ?? [],
      isLoading: isLoadingViolationTags,
    },
  };
}
