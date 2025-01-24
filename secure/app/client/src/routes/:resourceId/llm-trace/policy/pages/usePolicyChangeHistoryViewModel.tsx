import { useState } from 'react';
import { useLlmTracePolicyContext } from '~/routes/:resourceId/llm-trace/policy/LlmTracePolicyIndex';
import { trpc } from '~/utils/trpc';

export const usePolicyChangeHistoryViewModel = () => {
  const { resourceId } = useLlmTracePolicyContext();
  const { data, isLoading } = trpc.meta.llmTracePolicy.listPolicyVersions.useQuery({ resourceId });
  const [selectedPolicyVersion, setSelectedPolicyVersion] = useState<number | null>(null);
  const sortedData = [...(data ?? [])].sort((a, b) => Number(b.creationTime) - Number(a.creationTime));

  const isEnabledGetPolicyYaml = selectedPolicyVersion !== null;
  const { data: policyYamlData, isLoading: isLoadingPolicyYaml } =
    trpc.meta.llmTracePolicy.getPolicyYamlConfiguration.useQuery(
      {
        resourceId,
        version: selectedPolicyVersion ?? 0,
      },
      { enabled: isEnabledGetPolicyYaml },
    );

  const viewConfigHandler = (version: number | null) => () => {
    setSelectedPolicyVersion(version);
  };

  return {
    isLoading,
    data: sortedData,
    viewConfigHandler,
    policyVersionDetails: {
      isOpened: isEnabledGetPolicyYaml,
      selectedPolicyVersion,
      isLoading: isLoadingPolicyYaml && isEnabledGetPolicyYaml,
      data: policyYamlData,
    },
  };
};
