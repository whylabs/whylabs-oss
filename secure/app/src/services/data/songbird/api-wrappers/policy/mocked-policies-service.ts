import { ConfigSelections, PoliciesJsonSchema } from '../../../../../schemas/generated/llm-policies-schema';
import { LLMPoliciesService, PolicyConfigurationHistoryEntry } from './llm-policies-service';
import getPoliciesSchema from './mock/getPoliciesSchemaMock.json';
import getResourcePoliciesConfig from './mock/getResourcePoliciesConfigMock.json';

export class MockedLLMPoliciesService implements LLMPoliciesService {
  async getPoliciesSchema(): Promise<PoliciesJsonSchema | null> {
    // @ts-expect-error - this is a mock
    return getPoliciesSchema;
  }

  async getResourcePoliciesConfig(): Promise<ConfigSelections | null> {
    // @ts-expect-error - this is a mock
    return getResourcePoliciesConfig;
  }

  async upsertResourcePoliciesConfig(): Promise<boolean> {
    return true;
  }

  async getPolicyVersionsHistory(): Promise<PolicyConfigurationHistoryEntry[] | null> {
    return [];
  }

  async getPolicyYamlConfig(): Promise<string | null> {
    return null;
  }
}
