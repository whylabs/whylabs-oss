import { z } from 'zod';

import {
  ConfigSelections,
  PoliciesJsonSchema,
  PolicyConfigSelection,
} from '../../../schemas/generated/llm-policies-schema';
import {
  PolicyConfigurationHistoryEntry,
  getPoliciesSchema,
  getPolicyVersionsHistory,
  getPolicyYamlConfig,
  getResourcePoliciesConfig,
  upsertResourcePoliciesConfig,
} from '../../../services/data/songbird/api-wrappers/llmPolicies';
import { manageResourceFeatureProcedure, router, viewResourceDataProcedure } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { uiPoliciesSchema } from './utils/llmPolicyUtils';

export const llmTracePolicy = router({
  list: viewResourceDataProcedure.query(async ({ ctx, input: { orgId, resourceId } }): Promise<PoliciesJsonSchema> => {
    const callOptions = callOptionsFromTrpcContext(ctx);
    const [schema, configSelections] = await Promise.allSettled([
      getPoliciesSchema(callOptions),
      getResourcePoliciesConfig(orgId, resourceId, callOptions),
    ]);
    const usedSchema = (schema.status === 'fulfilled' ? schema.value : uiPoliciesSchema) || uiPoliciesSchema;
    const usedConfigSelections = configSelections.status === 'fulfilled' ? configSelections.value : null;
    if (usedConfigSelections && Object.keys(usedConfigSelections).length) {
      const selections: PolicyConfigSelection[] = [];
      usedSchema.policies.forEach((policy) => {
        const resourcePolicyConfig = usedConfigSelections.policies?.find((p) => policy.id === p.id);
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
    .mutation(async ({ ctx, input: { orgId, resourceId, config } }): Promise<boolean> => {
      const { userMetadata } = ctx;
      const user = userMetadata?.email ?? userMetadata?.userId;
      const configJson: ConfigSelections = { ...config, lastUpdatedTimestamp: Date.now(), lastUpdatedAuthor: user };
      return upsertResourcePoliciesConfig(orgId, resourceId, configJson, callOptionsFromTrpcContext(ctx));
    }),
  listPolicyVersions: viewResourceDataProcedure.query(
    async ({ ctx, input: { orgId, resourceId } }): Promise<PolicyConfigurationHistoryEntry[] | null> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return getPolicyVersionsHistory(orgId, resourceId, callOptions);
    },
  ),
  getCurrentPolicy: viewResourceDataProcedure.query(
    async ({ ctx, input: { orgId, resourceId } }): Promise<PolicyConfigurationHistoryEntry | null> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      const policies = await getPolicyVersionsHistory(orgId, resourceId, callOptions);
      return policies?.sort((a, b) => Number(b.version) - Number(a.version))?.[0] ?? null;
    },
  ),
  getPolicyYamlConfiguration: viewResourceDataProcedure
    .input(z.object({ version: z.number().min(0).nonnegative() }))
    .query(async ({ ctx, input: { orgId, resourceId, version } }): Promise<string | null> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return getPolicyYamlConfig(orgId, resourceId, version, callOptions);
    }),
});
