import { useDebouncedState } from '@mantine/hooks';
import _isEqual from 'lodash/isEqual';
import { useRef, useState } from 'react';
import { LoaderFunction, useLoaderData, useRevalidator } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { LoaderData } from '~/types/LoaderData';
import { POLICY_OPENED_CARD } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { PoliciesJsonSchema, PolicyConfigSelection } from '~server/schemas/generated/llm-policies-schema';

export const loader = (({ params }) => {
  const { resourceId } = params;
  invariant(resourceId, 'resourceId must exist in this route');
  return { resourceId };
}) satisfies LoaderFunction;

export const useLlmTracePolicyViewModel = () => {
  const { resourceId } = useLoaderData() as LoaderData<typeof loader>;
  const { data: schema, isLoading: isLoadingSchema } = trpc.meta.llmTracePolicy.list.useQuery({
    resourceId,
  });
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

  const resourceConfigMutation = trpc.meta.llmTracePolicy.updateResourceConfig.useMutation();
  const { isSaving } = useMutationProperties({ mutation: resourceConfigMutation, revalidator });

  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [activeMenuItem, setActiveMenuItem] = useState<string | null>(searchParams.get(POLICY_OPENED_CARD));

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
    resourceId,
    schema: usedSchema,
    isDirty,
    isSaving,
    onClearClick,
    onClickSave,
    updatePolicyConfigSelection,
    cardRefs,
    activeMenuItem: activeMenuItem ?? schema?.policies[0]?.id,
    setActiveMenuItem,
    setCurrentAdvancedSettingsYAML,
    setCurrentCallbackYAML,
    callbackSettingsYAML: usedCallbackSettings,
    advancedSettingsYAML: usedAdvancedSettings,
    setPolicySearchParam,
    hasLoadingQueries: isLoadingSchema,
  };
};
