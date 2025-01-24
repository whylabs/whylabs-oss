import { useCallback, useMemo } from 'react';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { NestedObservationTreeItem } from '~/components/ObservationTree/types';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { stringToSecurePathMap } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';

import { LlmTraceObservationItem } from '../components/LlmTraceObservationItem';

export const loader = (({ params }) => {
  const { itemId, resourceId, tabId, traceId } = params;
  invariant(resourceId, 'resourceId must exist in this route');
  invariant(tabId, 'tabId must exist in this route');
  invariant(traceId, 'traceId must exist in this route');

  return { itemId, resourceId, tabId, traceId };
}) satisfies LoaderFunction;

export function useLlmTraceIdViewModel() {
  const { itemId, resourceId, tabId, traceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const llmSecurePath = stringToSecurePathMap.get(tabId);

  const isQueryEnabled = !!traceId;
  const { data, isLoading: isQueryLoading } = trpc.meta.llmTrace.describe.useQuery(
    {
      resourceId,
      traceId,
    },
    {
      enabled: isQueryEnabled,
    },
  );
  const isLoading = isQueryEnabled && isQueryLoading;

  const selectedTrace = data?.summary;
  const childrenData = data?.children;

  const observations = useMemo((): NestedObservationTreeItem[] => {
    if (!childrenData?.length) return [];

    // Step 1: Create a map where the keys are object IDs, and the values are
    // the corresponding objects with an added 'children' property.
    const map = new Map<string, NestedObservationTreeItem>();
    childrenData.forEach((obj) => {
      map.set(obj.id, {
        id: obj.id,
        title: (
          <LlmTraceObservationItem
            description={obj.latency}
            name={obj.name}
            secureTags={obj.parsedTags}
            type={obj.type}
          />
        ),
        parentId: obj.parentId,
        children: [],
      });
    });

    // Step 2: Create another map for the roots of all trees.
    const roots = new Map<string, NestedObservationTreeItem>();

    // Step 3: Populate the 'children' arrays and root map.
    map.forEach((obj) => {
      if (obj.parentId) {
        const parent = map.get(obj.parentId);
        if (parent) parent.children?.push(obj);
      } else {
        roots.set(obj.id, obj);
      }
    });

    // Step 4: Return the roots.
    return Array.from(roots.values());
  }, [childrenData]);

  const onSelectTraceItem = useCallback(
    (id: string) => {
      handleNavigation({ page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces', traceId, traceItem: id } });
    },
    [handleNavigation, llmSecurePath, traceId],
  );

  const unselectTrace = useCallback(() => {
    handleNavigation({ page: 'llm-secure', llmSecure: { path: llmSecurePath ?? 'traces' } });
  }, [handleNavigation, llmSecurePath]);

  useDeepCompareEffect(() => {
    if (!selectedTrace && isQueryEnabled && !isLoading) {
      unselectTrace();
    }
  }, [isLoading, isQueryEnabled, selectedTrace, unselectTrace]);

  useDeepCompareEffect(() => {
    // If there is no selected tree trace item and there is a selected trace
    if (!itemId && traceId && observations[0]) {
      // select the first trace item automatically
      onSelectTraceItem(observations[0].id);
    }
  }, [observations, itemId, traceId]);

  return {
    isLoading,
    observations,
    onSelectTraceItem,
    selectedTrace,
    selectedItemId: itemId,
    unselectTrace,
  };
}
