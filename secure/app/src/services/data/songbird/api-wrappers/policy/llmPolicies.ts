import { ConfigSelections, PoliciesJsonSchema } from '../../../../../schemas/generated/llm-policies-schema';
import { CallOptions } from '../../../../../util/async-helpers';
import { LLMPoliciesService, PolicyConfigurationHistoryEntry } from './llm-policies-service';
import { MockedLLMPoliciesService } from './mocked-policies-service';

export class DefaultLLMPoliciesService implements LLMPoliciesService {
  service: LLMPoliciesService;

  constructor() {
    this.service = new MockedLLMPoliciesService();
  }

  async getPoliciesSchema(options?: CallOptions | undefined): Promise<PoliciesJsonSchema | null> {
    return this.service.getPoliciesSchema(options);
  }

  async getResourcePoliciesConfig(resourceId: string, options?: CallOptions): Promise<ConfigSelections | null> {
    return this.service.getResourcePoliciesConfig(resourceId, options);
  }

  async upsertResourcePoliciesConfig(
    resourceId: string,
    config: ConfigSelections,
    options?: CallOptions,
  ): Promise<boolean> {
    return this.service.upsertResourcePoliciesConfig(resourceId, config, options);
  }

  async getPolicyVersionsHistory(
    resourceId: string,
    options?: CallOptions,
  ): Promise<PolicyConfigurationHistoryEntry[] | null> {
    return this.service.getPolicyVersionsHistory(resourceId, options);
  }

  async getPolicyYamlConfig(resourceId: string, version: number, options?: CallOptions): Promise<string | null> {
    return this.service.getPolicyYamlConfig(resourceId, version, options);
  }
}
