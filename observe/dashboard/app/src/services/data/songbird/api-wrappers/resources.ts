import { ModelMetadataResponse, ModelType, TimePeriod } from '@whylabs/songbird-node-client';
import { some } from 'lodash';

import { ModelMetadata } from '../../../../graphql/contract-converters/songbird/model-converters';
import { CustomTagFilter, DataAvailability, ModelType as GQLModelType } from '../../../../graphql/generated/graphql';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { listOrganizationCustomTags } from '../../data-service/api-wrappers/resource-tagging';
import { getDataAvailability } from '../../data-service/api-wrappers/time-boundary';
import { songbirdClient } from '../songbird-client-factory';
import { logger, mapStringToResourceType, tryGetMetadata } from './utils';

export type ResourceWithAvailability = ModelMetadata & {
  dataAvailability?: DataAvailability;
};

export const createModel = async (
  orgId: string,
  name: string,
  timePeriod: TimePeriod,
  modelType?: ModelType,
  modelId?: string,
  options?: CallOptions,
): Promise<ModelMetadataResponse> => {
  logger.info('Creating a new model for org %s, with time period %s and type %s', orgId, timePeriod, modelType);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId: modelId }, options);
  const response = await tryCall(
    () => client.models.createModel(orgId, name, timePeriod, modelType, modelId, axiosCallConfig(options)),
    options,
  );
  return response.data;
};
export const updateModel = async (
  orgId: string,
  modelId: string,
  modelName: string,
  timePeriod: TimePeriod,
  modelType?: ModelType,
  options?: CallOptions,
): Promise<ModelMetadataResponse> => {
  logger.info(`Updating model for org ${orgId}, model ${modelId} with time period ${timePeriod}`);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId: modelId }, options);
  const response = await tryCall(
    () => client.models.updateModel(orgId, modelId, modelName, timePeriod, modelType, axiosCallConfig(options)),
    options,
  );
  return response.data;
};
export const deactivateModel = async (
  orgId: string,
  modelId: string,
  options?: CallOptions,
): Promise<ModelMetadataResponse> => {
  options = addToContext({ datasetId: modelId }, options);
  logger.info(`Deactivating model ${modelId} for org ${orgId}`);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.models.deactivateModel(orgId, modelId, axiosCallConfig(options)),
    options,
  );

  return response.data;
};

export const getModels = async (
  orgId: string,
  options?: CallOptions,
  includeLineage = false,
): Promise<ResourceWithAvailability[]> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(() => client.models.listModels(orgId, axiosCallConfig(options)), options);
  const allOrgTags = await listOrganizationCustomTags(orgId, options);
  const orgResourceTagsMap = new Map(allOrgTags.map((t) => [`${t.key}:${t.value}`, t]));
  const resourcesArray = Array.from(response.data.items);
  const resourcesMap = new Map<string, ResourceWithAvailability>(
    resourcesArray.map((r) => {
      const tagsWithColors = r.tags.map((tag) => {
        const tagId = `${tag.key}:${tag.value}`;
        const foundTag = orgResourceTagsMap.get(tagId);
        return foundTag ?? tag;
      });
      return [r.id, { ...r, tags: tagsWithColors ?? [] }];
    }),
  );
  if (includeLineage) {
    const resourcesAvailability = await getDataAvailability(
      { orgId, timePeriod: TimePeriod.P1D }, // backend gap: timePeriod should be passed for each dataset
      [...resourcesMap.keys()].map((datasetId) => ({ datasetId })),
      options,
    );
    resourcesArray.forEach((r) => {
      const dataAvailability = resourcesAvailability.get(r.id);
      const currentResource = resourcesMap.get(r.id);
      if (!currentResource) return;
      resourcesMap.set(r.id, {
        ...currentResource,
        active: r.active,
        dataAvailability,
      });
    });
  }
  return Array.from(resourcesMap.values());
};
export const getModel = async (
  orgId: string,
  datasetId: string,
  options?: CallOptions,
): Promise<ModelMetadata | null> => {
  logger.info('Fetching dataset %s for org %s', datasetId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const allOrgTags = await listOrganizationCustomTags(orgId, options);
  const orgResourceTagsMap = new Map(allOrgTags.map((t) => [`${t.key}:${t.value}`, t]));
  options = addToContext({ datasetId }, options);
  const model = await tryGetMetadata(
    () => client.models.getModel(orgId, datasetId, axiosCallConfig(options)),
    true,
    options?.context,
  );
  const mappedTags = model?.tags?.map((t) => orgResourceTagsMap.get(`${t.key}:${t.value}`) ?? t) ?? [];
  return model ? { ...model, tags: mappedTags } : null;
};

export type ResourceTypeFilterOption = GQLModelType | 'secured-llm';

export interface ResourceFilters {
  resourceType?: ResourceTypeFilterOption[] | null;
  resourceTags?: CustomTagFilter[] | null;
  resourceIds?: string[] | null;
  searchTerm?: string | null;
}

export const filterResources = (
  resources: ResourceWithAvailability[],
  filter?: ResourceFilters,
): ResourceWithAvailability[] => {
  return resources.filter((r) => {
    let shouldReturn = true;
    if (filter?.resourceType?.length) {
      // todo - implement secured LLM filter
      const gqlModelType = mapStringToResourceType.get(r.modelType ?? 'UNKNOWN');
      shouldReturn = !!(gqlModelType && filter.resourceType.includes(gqlModelType));
    }
    if (filter?.resourceTags?.length) {
      const { tags } = r;
      shouldReturn = shouldReturn && tags.some((tag) => some(filter.resourceTags, { key: tag.key, value: tag.value }));
    }
    if (filter?.resourceIds?.length) {
      const datasetIDFilter = new Set(filter.resourceIds);
      shouldReturn = shouldReturn && datasetIDFilter.has(r.id);
    }
    if (filter?.searchTerm) {
      const searchString = filter.searchTerm.toLowerCase();
      shouldReturn =
        shouldReturn && (r.id.toLowerCase().includes(searchString) || r.name.toLowerCase().includes(searchString));
    }

    return shouldReturn;
  });
};
