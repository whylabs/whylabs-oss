import { z } from 'zod';

import {
  ConfigSelections,
  PoliciesJsonSchema,
  PolicyConfigSelection,
} from '../../../schemas/generated/llm-policies-schema';
import { PolicyConfigurationHistoryEntry } from '../../../services/data/songbird/api-wrappers/policy/llm-policies-service';
import { DefaultLLMPoliciesService } from '../../../services/data/songbird/api-wrappers/policy/llmPolicies';
import { manageResourceFeatureProcedure, router, viewResourceDataProcedure } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { uiPoliciesSchema } from './utils/llmPolicyUtils';

const policiesService = new DefaultLLMPoliciesService();

export const llmTracePolicy = router({
  list: viewResourceDataProcedure.query(async ({ ctx, input: { resourceId } }): Promise<PoliciesJsonSchema> => {
    const callOptions = callOptionsFromTrpcContext(ctx);
    const [schema, configSelections] = await Promise.allSettled([
      policiesService.getPoliciesSchema(callOptions),
      policiesService.getResourcePoliciesConfig(resourceId, callOptions),
    ]);
    const usedSchema = (schema.status === 'fulfilled' ? schema.value : uiPoliciesSchema) || uiPoliciesSchema;
    const usedConfigSelections = configSelections.status === 'fulfilled' ? configSelections.value : null;
    if (usedConfigSelections && Object.keys(usedConfigSelections).length) {
      const selections: PolicyConfigSelection[] = [];
      usedSchema.policies.forEach((policy) => {
        const resourcePolicyConfig = usedConfigSelections.policies.find((p) => policy.id === p.id);
        const fallbackPolicyConfig = usedSchema.configSelections.policies.find((p) => policy.id === p.id);
        const usedPolicyConfig = resourcePolicyConfig || fallbackPolicyConfig;
        if (usedPolicyConfig) selections.push(usedPolicyConfig);
      });
      usedSchema.configSelections.policies = selections;
      usedSchema.configSelections.callbackSettings = usedConfigSelections.callbackSettings;
      usedSchema.configSelections.advancedSettings = usedConfigSelections.advancedSettings;
    }

    return usedSchema;
  }),
  // TRPC doesn't accept casting to interface, this is why we have to work around it
  // transforming in a type with Omit<ConfigSelections, ''>
  updateResourceConfig: manageResourceFeatureProcedure
    .input((object: unknown) => object as { config: Omit<ConfigSelections, ''> })
    .mutation(async ({ ctx, input: { resourceId, config } }): Promise<boolean> => {
      const { userMetadata } = ctx;
      const user = userMetadata?.email ?? userMetadata?.userId;
      const configJson: ConfigSelections = { ...config, lastUpdatedTimestamp: Date.now(), lastUpdatedAuthor: user };
      return policiesService.upsertResourcePoliciesConfig(resourceId, configJson, callOptionsFromTrpcContext(ctx));
    }),
  listPolicyVersions: viewResourceDataProcedure.query(
    async ({ ctx, input: { resourceId } }): Promise<PolicyConfigurationHistoryEntry[] | null> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return policiesService.getPolicyVersionsHistory(resourceId, callOptions);
    },
  ),
  getPolicyYamlConfiguration: viewResourceDataProcedure
    .input(z.object({ version: z.number().min(0).nonnegative() }))
    .query(async ({ ctx, input: { resourceId, version } }): Promise<string | null> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return policiesService.getPolicyYamlConfig(resourceId, version, callOptions);
    }),
});
