import { PolicyConfigurationListEntry } from '@whylabs/songbird-node-client';
import { Validator } from 'jsonschema';

import { WHYLABS_ORG_HEADER } from '../../../../constants';
import { ConfigSelections, PoliciesJsonSchema } from '../../../../schemas/generated/llm-policies-schema';
import jsonSchema from '../../../../schemas/llm-policies-json-schema.json';
import { CallOptions, axiosCallConfig } from '../../../../util/async-helpers';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const getPoliciesSchema = async (options?: CallOptions): Promise<PoliciesJsonSchema | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryGetMetadata(
    () => client.policy.getPolicyConfigurationSchema(axiosCallConfig(options)),
    true,
    options?.context,
  );
  if (!response) return null;
  try {
    const parsedObject = typeof response === 'object' ? response : JSON.parse(response);
    const validator = new Validator();
    const validation = validator.validate(parsedObject, jsonSchema);
    if (validation.valid) return parsedObject as PoliciesJsonSchema;
    logger.error(validation.errors, 'Failed to validate ui-schema: ');
    return null;
  } catch (e) {
    logger.error(e, 'Failed to fetch or parse policies schema: ', JSON.stringify(response));
    return null;
  }
};

export const getResourcePoliciesConfig = async (
  orgId: string,
  resourceId: string,
  options?: CallOptions,
): Promise<ConfigSelections | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryGetMetadata(
    () => client.policy.getJsonPolicy(orgId, resourceId, undefined, undefined, axiosCallConfig(options)),
    true,
    options?.context,
  );
  if (!response) return null;
  try {
    const usedObject = typeof response === 'object' ? response : JSON.parse(response);
    if (usedObject) return usedObject as unknown as ConfigSelections;
    return null;
  } catch (e) {
    logger.error(
      e,
      `'Failed to parse policies config for org ${orgId} resource ${resourceId}: `,
      JSON.stringify(response),
    );
    logger.error('Failed to parse policies config: ', response);
    return null;
  }
};

export const upsertResourcePoliciesConfig = async (
  orgId: string,
  resourceId: string,
  config: ConfigSelections,
  options?: CallOptions,
): Promise<boolean> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const configString = JSON.stringify(config);
  const response = await tryGetMetadata(
    () => client.policy.putJsonPolicy(orgId, resourceId, configString, undefined, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return !!response;
};

export type PolicyConfigurationHistoryEntry = PolicyConfigurationListEntry;
export const getPolicyVersionsHistory = async (
  orgId: string,
  resourceId: string,
  options?: CallOptions,
): Promise<PolicyConfigurationHistoryEntry[] | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(
    () => client.policy.listPolicyVersions(orgId, resourceId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};

export const getPolicyYamlConfig = async (
  orgId: string,
  resourceId: string,
  version: number,
  options?: CallOptions,
): Promise<string | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const axiosConfig = axiosCallConfig(options);
  axiosConfig.headers[WHYLABS_ORG_HEADER] = orgId;
  return tryGetMetadata(
    () => client.policy.getPolicy(resourceId, undefined, version, undefined, axiosConfig),
    true,
    options?.context,
  );
};
