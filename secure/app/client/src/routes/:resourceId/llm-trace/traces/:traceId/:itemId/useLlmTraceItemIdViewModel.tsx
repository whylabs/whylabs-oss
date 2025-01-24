import { useCallback } from 'react';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { stringToSecurePathMap } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';

import { useLlmTraceIdContext } from '../LlmTraceId';

export const loader = (({ params }) => {
  const { itemId, resourceId, tabId, traceId } = params;
  invariant(resourceId, 'resourceId must exist in this route');
  invariant(tabId, 'tabId must exist in this route');
  invariant(traceId, 'traceId must exist in this route');
  invariant(itemId, 'itemId must exist in this route');

  return { itemId, resourceId, tabId, traceId };
}) satisfies LoaderFunction;

export const useLlmTraceItemIdViewModel = () => {
  const { itemId, resourceId, tabId, traceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const selectedTrace = useLlmTraceIdContext();
  const llmSecurePath = stringToSecurePathMap.get(tabId);

  const isTheSummaryItem = itemId === traceId;
  const isQueryEnabled = !isTheSummaryItem;
  const { data, isLoading } = trpc.meta.llmTrace.describeItem.useQuery(
    {
      itemId,
      resourceId,
      traceId,
    },
    { enabled: isQueryEnabled },
  );

  // If the selected item is the summary item, we use the selected trace data instead
  const selectedItem = isTheSummaryItem ? selectedTrace : data;

  const unselectTrace = useCallback(() => {
    handleNavigation({ page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces', traceId } });
  }, [handleNavigation, llmSecurePath, traceId]);

  useDeepCompareEffect(() => {
    if (!selectedItem && isQueryEnabled && !isLoading) {
      unselectTrace();
    }
  }, [isLoading, isQueryEnabled, selectedItem]);

  return { isLoading: isQueryEnabled && isLoading, selectedItem };
};
