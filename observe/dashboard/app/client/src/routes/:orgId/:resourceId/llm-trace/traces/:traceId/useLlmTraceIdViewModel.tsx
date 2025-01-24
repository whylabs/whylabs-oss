import { SelectItem } from '@mantine/core';
import { NestedObservationTreeItem } from '~/components/ObservationTree/types';
import { ComposedFilterDimension } from '~/hooks/composed-filter/types';
import { useComposedFilter } from '~/hooks/composed-filter/useComposedFilter';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { LoaderData } from '~/types/LoaderData';
import { TRACE_DETAIL_FILTER_KEY } from '~/utils/searchParamsConstants';
import { upperCaseFirstLetterAndKeepRest } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';
import { isEqual } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { LlmTraceObservationItem } from '../components/LlmTraceObservationItem';
import { dimensionOptions } from '../components/utils';

export const loader = (({ params }) => {
  const { itemId, orgId, resourceId, traceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');
  invariant(traceId, 'traceId must exist in this route');

  return { itemId, orgId, resourceId, traceId };
}) satisfies LoaderFunction;

const DISABLED_DIMENSIONS = [
  'applicationId', // Filtering on application ID in details wouldn't make sense
  'policyIssues', // Disabled for P0
  'traceId', // Same as applicationId
];

const TRACE_DETAIL_FILTERS_DIMENSION_OPTIONS: ComposedFilterDimension[] = [
  ...dimensionOptions.filter(({ value }) => !DISABLED_DIMENSIONS.includes(value)),
  {
    label: 'Type',
    type: 'list',
    value: 'type',
  },
];

export function useLlmTraceIdViewModel() {
  const { itemId, orgId, resourceId, traceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();

  const composedFilterViewModel = useComposedFilter({
    dimensionOptions: TRACE_DETAIL_FILTERS_DIMENSION_OPTIONS,
    key: TRACE_DETAIL_FILTER_KEY,
  });

  const isQueryEnabled = !!traceId;
  const { data, isLoading: isQueryLoading } = trpc.meta.llmTrace.describe.useQuery(
    {
      composedFilters: composedFilterViewModel.debouncedReadyToQueryFilters,
      orgId,
      resourceId,
      traceId,
    },
    {
      enabled: isQueryEnabled,
    },
  );
  const isLoading = isQueryEnabled && isQueryLoading;

  const violationTagsOptionsRef = useRef<SelectItem[]>([]);

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
      handleNavigation({
        page: 'llm-secure',
        llmSecure: { path: 'traces', traceId, traceItem: id },
        saveParams: [TRACE_DETAIL_FILTER_KEY],
      });
    },
    [handleNavigation, traceId],
  );

  const unselectTrace = useCallback(() => {
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces' },
      setParams: [{ name: TRACE_DETAIL_FILTER_KEY, value: null }],
    });
  }, [handleNavigation]);

  useDeepCompareEffect(() => {
    if (!selectedTrace && isQueryEnabled && !isLoading) {
      unselectTrace();
    }
  }, [isLoading, isQueryEnabled, selectedTrace, unselectTrace]);

  useDeepCompareEffect(() => {
    const newSelectItemsList =
      data?.violationTagsOptions?.map((value) => ({ label: upperCaseFirstLetterAndKeepRest(value), value })) ?? [];
    // Prevent updating the ref if the data is still loading or the data is the same
    if (!isLoading && !isEqual(violationTagsOptionsRef.current, newSelectItemsList)) {
      violationTagsOptionsRef.current = newSelectItemsList;
    }
  }, [isLoading, data?.violationTagsOptions]);

  useDeepCompareEffect(() => {
    // If there is no selected tree trace item and there is a selected trace
    if (!itemId && traceId && observations[0]) {
      // select the first trace item automatically
      onSelectTraceItem(observations[0].id);
    }
  }, [observations, itemId, traceId]);

  return {
    composedFilterViewModel,
    isLoading,
    observations,
    onSelectTraceItem,
    selectedTrace,
    selectedItemId: itemId,
    unselectTrace,
    violationTagsOptions: violationTagsOptionsRef.current,
  };
}
