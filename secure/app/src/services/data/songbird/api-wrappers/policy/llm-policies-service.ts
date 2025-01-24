import { ConfigSelections, PoliciesJsonSchema } from '../../../../../schemas/generated/llm-policies-schema';
import { CallOptions } from '../../../../../util/async-helpers';

/**
 * Storage for policy configuration list entry
 * @export
 * @interface PolicyConfigurationListEntry
 */
export type PolicyConfigurationHistoryEntry = {
  datasetId: string;
  version: string;
  label?: string | null;
  author?: string | null;
  identity?: string | null;
  source?: string | null;
  creationTime: string;
};

export interface LLMPoliciesService {
  getPoliciesSchema: (options?: CallOptions) => Promise<PoliciesJsonSchema | null>;

  getResourcePoliciesConfig: (resourceId: string, options?: CallOptions) => Promise<ConfigSelections | null>;

  upsertResourcePoliciesConfig: (
    resourceId: string,
    config: ConfigSelections,
    options?: CallOptions,
  ) => Promise<boolean>;

  getPolicyVersionsHistory: (
    resourceId: string,
    options?: CallOptions,
  ) => Promise<PolicyConfigurationHistoryEntry[] | null>;

  getPolicyYamlConfig: (resourceId: string, version: number, options?: CallOptions) => Promise<string | null>;
}
