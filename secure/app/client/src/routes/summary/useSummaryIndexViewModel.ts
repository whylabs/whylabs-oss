import { useMemo } from 'react';
import { trpc } from '~/utils/trpc';

export const useSummaryIndexViewModel = () => {
  const { data: resourcesData, isLoading: isLoadingResources } = trpc.meta.resources.list.useQuery({
    withAvailability: true,
    orderByTimePeriod: true,
  });

  // Listing LLMs first because Llm-secure is the unique :resourceId page we currently have in dashbird-ui
  const sortedModels = useMemo(
    () => [...(resourcesData ?? [])].sort((a, b) => Number(b.modelType === 'LLM') - Number(a.modelType === 'LLM')),
    [resourcesData],
  );

  return {
    isLoadingResources,
    resourcesData: sortedModels,
  };
};
