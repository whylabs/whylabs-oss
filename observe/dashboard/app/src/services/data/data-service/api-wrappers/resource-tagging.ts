import { ResourceTag, ValidateResourceTagConfigurationResponse } from '@whylabs/data-service-node-client/dist/api';

import { CustomTag } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { getModels } from '../../songbird/api-wrappers/resources';
import { dataServiceClient } from '../data-service-client-factory';
import { NONE_TAGS_GROUP } from './utils/resource-tagging';

const logger = getLogger('resourceTagging');

export const deleteResourceTagKey = async (
  orgId: string,
  resourceId: string,
  tagKey: string,
  tagValue: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Deleting tagKey %s from resource %s', tagKey, resourceId);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  await tryCall(
    () => client.datasetsApi.deleteResourceTag(orgId, resourceId, tagKey, tagValue, axiosCallConfig(options)),
    options,
  );
};

export const listResourceTags = async (
  orgId: string,
  resourceId: string,
  options?: CallOptions,
): Promise<CustomTag[]> => {
  const allOrgTags = await listOrganizationCustomTags(orgId, options);
  const orgTags = new Map(allOrgTags.map((t) => [`${t.key}:${t.value}`, t]));
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(
    () => client.datasetsApi.listResourceTags(orgId, resourceId, axiosCallConfig(options)),
    options,
  );
  const uniqueTags = new Map<string, CustomTag>();
  response.data.map((tag) => {
    const tagId = `${tag.key}:${tag.value}`;
    const foundTag = orgTags.get(tagId);
    uniqueTags.set(tagId, foundTag ?? tag);
  });
  return [...uniqueTags.values()];
};

export const setResourceTagKeyValue = async (
  orgId: string,
  resourceId: string,
  key: string,
  value: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('set tag %s:%s to resource %s', key, value, resourceId);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;

  const payload = {
    orgId,
    resourceId,
    key,
    value,
    // colors are not used by this endpoint, but needed to make lint happy
    color: '',
    bgColor: '',
  };

  if (key === NONE_TAGS_GROUP) {
    // For uncategorized tags, use the POST endpoint since we don't want to overwrite it
    await tryCall(() => client.datasetsApi.writeResourceTag(payload, axiosCallConfig(options)), options);
  } else {
    await tryCall(() => client.datasetsApi.replaceResourceTag(payload, axiosCallConfig(options)), options);
  }
};

const mapDataServiceCustomTagToGraphQL = (tag: ResourceTag): CustomTag => {
  const { bgColor, ...rest } = tag;
  return { ...rest, backgroundColor: bgColor };
};

export const listOrganizationCustomTags = async (orgId: string, options?: CallOptions): Promise<CustomTag[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  logger.info('Fetching org tags for %s', orgId);
  const response = await tryCall(
    () => client.organizationsApi.listOrganizationResourceTags(orgId, axiosCallConfig(options)),
    options,
  );
  return response.data.map(mapDataServiceCustomTagToGraphQL);
};

export const getOrganizationCustomTagsConfig = async (orgId: string, options?: CallOptions): Promise<string> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  logger.info('Fetching org tags for %s', orgId);
  const response = await tryCall(
    () => client.organizationsApi.getOrgResourceTagConfiguration(orgId, axiosCallConfig(options)),
    options,
  );
  if (response.data === dataServiceFallback) return uiFallbackTags;
  return response.data.replace('labels: [\n  ]\n', '').replace('tags: {\n  }\n', '');
};

export const validateOrganizationCustomTagsConfig = async (
  orgId: string,
  yaml: string,
  options?: CallOptions,
): Promise<ValidateResourceTagConfigurationResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  logger.info('Validating %s tags config changes \n %s', orgId, yaml);
  const response = await tryCall(
    () =>
      client.organizationsApi.validateOrgResourceTagConfiguration(
        orgId,
        yaml,
        getAxiosConfigWithYamlContentType(options),
      ),
    options,
  );
  return response.data;
};

const getAxiosConfigWithYamlContentType = (options?: CallOptions) => {
  return {
    ...axiosCallConfig(options),
    headers: { ...axiosCallConfig(options).headers, 'Content-Type': 'application/x-yaml' },
  };
};

export const updateOrganizationCustomTagsConfig = async (
  orgId: string,
  yaml: string,
  options?: CallOptions,
): Promise<boolean> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  logger.info('Updating %s tags config to %s', orgId, yaml);
  const response = await tryCall(
    () =>
      client.organizationsApi.uploadOrgResourceTagConfiguration(
        orgId,
        yaml,
        getAxiosConfigWithYamlContentType(options),
      ),
    options,
  );
  return response.status === 200;
};

export const getResourceTagsInUse = async (orgId: string, options?: CallOptions): Promise<CustomTag[]> => {
  const models = await getModels(orgId, options);
  const uniqueTags = new Map<string, CustomTag>();
  models.forEach((m) => {
    m.tags.forEach((tag) => {
      const tagId = `${tag.key}:${tag.value}`;
      uniqueTags.set(tagId, tag);
    });
  });
  return [...uniqueTags.values()];
};

const dataServiceFallback = 'labels: [\n  ]\ntags: {\n  }\n';

const uiFallbackTags = `### YAML Tag Editor
### Labels are uncategorized strings, randomly colored
### Tags are key-value groups. You can optionally customize the background and font color of keys using HEX values.

labels:
  - # insert strings here
tags:
  fooBar: # is a key
    # bgColor: '#000000' (Optional)
    # color: '#FFFFFF' (Optional)
    values:
      - # insert value for fooBar as needed
      - # insert value for fooBar as needed
`;
