import { useLlmTracePolicyContext } from '~/routes/:orgId/:resourceId/llm-trace/policy/useLlmTracePolicyViewModel';
import { trpc } from '~/utils/trpc';
import { useState } from 'react';

export const usePolicyChangeHistoryViewModel = () => {
  const { orgId, resourceId, setPolicySourceAPI, isPolicySourceAPI } = useLlmTracePolicyContext();
  const { data, isLoading } = trpc.meta.llmTracePolicy.listPolicyVersions.useQuery({ orgId, resourceId });
  const [selectedPolicyVersion, setSelectedPolicyVersion] = useState<number | null>(null);
  const sortedData = [...(data ?? [])].sort((a, b) => Number(b.creationTime) - Number(a.creationTime));

  const isEnabledGetPolicyYaml = selectedPolicyVersion !== null;
  const { data: policyYamlData, isLoading: isLoadingPolicyYaml } =
    trpc.meta.llmTracePolicy.getPolicyYamlConfiguration.useQuery(
      {
        orgId,
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
    isPolicySourceAPI,
    setPolicySourceAPI,
    viewConfigHandler,
    policyVersionDetails: {
      isOpened: isEnabledGetPolicyYaml,
      selectedPolicyVersion,
      isLoading: isLoadingPolicyYaml && isEnabledGetPolicyYaml,
      data: policyYamlData,
    },
  };
};
