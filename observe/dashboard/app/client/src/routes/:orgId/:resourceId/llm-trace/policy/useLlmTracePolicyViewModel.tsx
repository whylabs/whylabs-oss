import { useDebouncedState } from '@mantine/hooks';
import { useIsDemoOrg } from '~/hooks/useIsDemoOrg';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { LoaderData } from '~/types/LoaderData';
import { findJsonifiedStringsInYamlArray } from '~/utils/safeYaml';
import { POLICY_OPENED_CARD } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { PoliciesJsonSchema, PolicyConfigSelection } from '~server/schemas/generated/llm-policies-schema';
import _isEqual from 'lodash/isEqual';
import { useEffect, useRef, useState } from 'react';
import { LoaderFunction, useLoaderData, useOutletContext, useRevalidator } from 'react-router-dom';
import invariant from 'tiny-invariant';

export function useLlmTracePolicyContext() {
  return useOutletContext<ReturnType<typeof useLlmTracePolicyViewModel>>();
}

export const loader = (async ({ params }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');
  const policy = await trpcProxyClient.meta.llmTracePolicy.getCurrentPolicy.query({ orgId, resourceId });
  return { orgId, resourceId, policy };
}) satisfies LoaderFunction;

export const useLlmTracePolicyViewModel = () => {
  const { orgId, resourceId, policy: latestPolicy } = useLoaderData() as LoaderData<typeof loader>;
  const { data: schema, isLoading: isLoadingSchema } = trpc.meta.llmTracePolicy.list.useQuery({
    orgId,
    resourceId,
  });

  const isDemoOrg = useIsDemoOrg();
  const [searchParams] = useSearchAndHashParams();
  const { handleNavigation } = useNavLinkHandler();
  const revalidator = useRevalidator();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [currentSchema, setCurrentSchema] = useState<PoliciesJsonSchema | null>(schema ?? null);
  const fetchedCallbackSettings = schema?.configSelections?.callbackSettings;
  const fetchedAdvancedSettings = schema?.configSelections?.advancedSettings;
  const [currentCallbackYAML, setCurrentCallbackYAML] = useDebouncedState<string | null>(
    fetchedCallbackSettings ?? null,
    200,
  );
  const [currentAdvancedSettingsYAML, setCurrentAdvancedSettingsYAML] = useDebouncedState<string | null>(
    fetchedAdvancedSettings ?? null,
    200,
  );

  const usedSchema = currentSchema ?? schema;
  const usedCallbackSettings = currentCallbackYAML ?? fetchedCallbackSettings;
  const usedAdvancedSettings = currentAdvancedSettingsYAML ?? fetchedAdvancedSettings;

  // Very basic way of checking to see if advanced policy settings have been edited for rulesets.
  const advancedRulesetEditKeys = findJsonifiedStringsInYamlArray(
    usedAdvancedSettings ?? '',
    'rulesets',
    'ruleset',
    'score.',
  );
  const resourceConfigMutation = trpc.meta.llmTracePolicy.updateResourceConfig.useMutation();
  const { isSaving } = useMutationProperties({ mutation: resourceConfigMutation, revalidator });

  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [isPolicySourceAPI, setPolicySourceAPI] = useState(!!latestPolicy && latestPolicy.source !== 'ui');

  useEffect(() => {
    setPolicySourceAPI(latestPolicy?.source !== 'ui');
  }, [latestPolicy?.source]);

  const [activeMenuItem, setActiveMenuItem] = useState<string | null | undefined>(
    searchParams.get(POLICY_OPENED_CARD) ?? schema?.policies[0]?.id ?? undefined,
  );

  useEffect(() => {
    if (schema?.policies[0]?.id && activeMenuItem === undefined) {
      setActiveMenuItem(schema.policies[0].id);
    }
  }, [activeMenuItem, schema?.policies]);

  const isDirty =
    !_isEqual(schema, usedSchema) ||
    usedCallbackSettings !== fetchedCallbackSettings ||
    usedAdvancedSettings !== fetchedAdvancedSettings;

  const setPolicySearchParam = (id: string | null) => {
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'policy' },
      setParams: id ? [{ name: POLICY_OPENED_CARD, value: id }] : undefined,
    });
  };

  const updatePolicyConfigSelection = (policySelection: PolicyConfigSelection) => {
    setCurrentSchema((prevState) => {
      const usedPrevState = (() => {
        if (prevState) return prevState;
        return schema || { configSelections: { policies: [] }, policies: [] };
      })();
      const newPoliciesConfig = [...usedPrevState.configSelections.policies];
      const foundPolicyIndex = newPoliciesConfig.findIndex(({ id }) => id === policySelection.id);
      if (foundPolicyIndex !== -1) {
        newPoliciesConfig[foundPolicyIndex] = policySelection;
      } else {
        newPoliciesConfig.push(policySelection);
      }

      return {
        ...usedPrevState,
        configSelections: {
          ...usedPrevState.configSelections,
          policies: newPoliciesConfig,
        },
      };
    });
  };

  const onClearClick = () => {
    setCurrentSchema(schema ?? null);
    setCurrentCallbackYAML(fetchedCallbackSettings ?? '');
    setCurrentAdvancedSettingsYAML(fetchedAdvancedSettings ?? '');
  };

  const onClickSave = async () => {
    if (!usedSchema) return;
    await resourceConfigMutation.mutateAsync({
      orgId,
      resourceId,
      config: {
        ...usedSchema.configSelections,
        callbackSettings: usedCallbackSettings,
        advancedSettings: usedAdvancedSettings,
      },
    });
    enqueueSnackbar({ title: 'Policy successfully updated' });
    revalidator.revalidate();
  };

  return {
    isDemoOrg,
    orgId,
    resourceId,
    schema: usedSchema,
    isDirty,
    isSaving,
    onClearClick,
    onClickSave,
    updatePolicyConfigSelection,
    cardRefs,
    activeMenuItem,
    setActiveMenuItem,
    setCurrentAdvancedSettingsYAML,
    setCurrentCallbackYAML,
    callbackSettingsYAML: usedCallbackSettings,
    advancedSettingsYAML: usedAdvancedSettings,
    editedAdvancedRulesets: advancedRulesetEditKeys,
    setPolicySearchParam,
    hasLoadingQueries: isLoadingSchema,
    isPolicySourceAPI,
    setPolicySourceAPI,
  };
};
