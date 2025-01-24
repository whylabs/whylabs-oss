import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';
import { useCallback } from 'react';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { useLlmTraceIdContext } from '../LlmTraceId';

export const loader = (({ params }) => {
  const { itemId, orgId, resourceId, traceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');
  invariant(traceId, 'traceId must exist in this route');
  invariant(itemId, 'itemId must exist in this route');

  return { itemId, orgId, resourceId, traceId };
}) satisfies LoaderFunction;

export const useLlmTraceItemIdViewModel = () => {
  const { itemId, orgId, resourceId, traceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const selectedTrace = useLlmTraceIdContext();

  const isTheSummaryItem = itemId === traceId;
  const isQueryEnabled = !isTheSummaryItem;
  const { data, isLoading } = trpc.meta.llmTrace.describeItem.useQuery(
    {
      itemId,
      orgId,
      resourceId,
      traceId,
    },
    { enabled: isQueryEnabled },
  );

  // If the selected item is the summary item, we use the selected trace data instead
  const selectedItem = isTheSummaryItem ? selectedTrace : data;

  const unselectTrace = useCallback(() => {
    handleNavigation({ page: 'llm-secure', llmSecure: { path: 'traces', traceId } });
  }, [handleNavigation, traceId]);

  useDeepCompareEffect(() => {
    if (!selectedItem && isQueryEnabled && !isLoading) {
      unselectTrace();
    }
  }, [isLoading, isQueryEnabled, selectedItem, unselectTrace]);

  return { isLoading: isQueryEnabled && isLoading, selectedItem };
};
