import { useOrganizationsList } from '~/hooks/useOrganizationsList';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';
import { useMemo } from 'react';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (({ params }) => {
  const { orgId } = params;
  invariant(orgId, 'orgId must exist in this route');

  return { orgId };
}) satisfies LoaderFunction;
export const useSummaryIndexViewModel = () => {
  const { organizationsList, onChangeOrganization } = useOrganizationsList();
  const { orgId } = useLoaderData() as LoaderData<typeof loader>;
  const { data: resourcesData, isLoading: isLoadingResources } = trpc.meta.resources.list.useQuery({
    orgId,
    withAvailability: true,
    orderByTimePeriod: true,
  });

  // Listing LLMs first because Llm-secure is the unique :resourceId page we currently have in dashbird-ui
  const sortedModels = useMemo(
    () => [...(resourcesData ?? [])].sort((a, b) => Number(b.modelType === 'LLM') - Number(a.modelType === 'LLM')),
    [resourcesData],
  );

  return {
    organizationsList,
    onChangeOrganization,
    orgId,
    isLoadingResources,
    resourcesData: sortedModels,
  };
};
