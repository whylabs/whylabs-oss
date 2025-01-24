import { z } from 'zod';

import {
  gqlAssetTypeToContract,
  gqlTimePeriodToContract,
  modelMetadataToModel,
} from '../../../graphql/contract-converters/songbird/model-converters';
import { ModelType, SortDirection, TimePeriod } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
import {
  deleteResourceTagKey,
  listResourceTags,
  setResourceTagKeyValue,
} from '../../../services/data/data-service/api-wrappers/resource-tagging';
import { NONE_TAGS_GROUP } from '../../../services/data/data-service/api-wrappers/utils/resource-tagging';
import {
  createModel,
  deactivateModel,
  filterResources,
  getModels,
  updateModel,
} from '../../../services/data/songbird/api-wrappers/resources';
import { formatAxiosError } from '../../../util/logging';
import { sortAsc, sortDesc } from '../../../util/misc';
import { manageOrgProcedure, router } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { createSortBySchema, sortDirectionSchema } from '../../util/schemas';
import { ResourcesOrderByEnum } from './types/resource-types';

const logger = getLogger('trpc resource settings router logger');

const tagsSchema = z.array(z.object({ key: z.string(), value: z.string() }));

export const resourcesSettings = router({
  listResources: manageOrgProcedure
    .input(
      z
        .object({
          sortBy: createSortBySchema(ResourcesOrderByEnum, 'CreationTimestamp'),
          resourceType: z.array(z.nativeEnum(ModelType).or(z.literal('secured-llm'))).nullish(),
          resourceTags: tagsSchema.nullish(),
          searchTerm: z.string().nullish(),
          resourceIds: z.array(z.string()).nullish(),
        })
        .merge(sortDirectionSchema),
    )
    .query(async ({ input: { orgId, sortBy, sortDirection, resourceType, resourceTags, resourceIds, searchTerm } }) => {
      const list = await getModels(orgId, undefined, true);

      const filteredList = filterResources(list, { resourceTags, resourceType, resourceIds, searchTerm });

      filteredList.sort((a, b) => {
        const sortFn = sortDirection === SortDirection.Asc ? sortAsc : sortDesc;

        switch (sortBy) {
          case ResourcesOrderByEnum.ID:
            return sortFn(a.id, b.id);

          case ResourcesOrderByEnum.LatestProfileTimestamp:
            if (!a.dataAvailability?.latestTimestamp) return b.dataAvailability?.latestTimestamp ? 1 : 0;
            if (!b.dataAvailability?.latestTimestamp) return a.dataAvailability?.latestTimestamp ? -1 : 0;
            return sortFn(a.dataAvailability?.latestTimestamp, b.dataAvailability?.latestTimestamp);

          case ResourcesOrderByEnum.Name:
            return sortFn(a.name, b.name);

          case ResourcesOrderByEnum.TimePeriod:
            if (!a.timePeriod) return b.timePeriod ? 1 : 0;
            if (!b.timePeriod) return a.timePeriod ? -1 : 0;
            return sortFn(a.timePeriod, b.timePeriod);

          case ResourcesOrderByEnum.Type:
            if (!a.modelType) return b.modelType ? 1 : 0;
            if (!b.modelType) return a.modelType ? -1 : 0;
            return sortFn(a.modelType, b.modelType);

          default:
            return sortFn(a.creationTime, b.creationTime);
        }
      });

      return filteredList;
    }),
  createResources: manageOrgProcedure
    .input(
      z.object({
        name: z.string(),
        timePeriod: z.string().nullable(),
        tags: tagsSchema,
        type: z.nativeEnum(ModelType).nullable(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, timePeriod, tags, type, name } }) => {
      logger.info('Creating a batch of models of size %s for org %s, type %s, timePeriod %s', orgId, type, timePeriod);

      const callOptions = callOptionsFromTrpcContext(ctx);

      try {
        const resource = await createModel(
          orgId,
          name,
          gqlTimePeriodToContract((timePeriod as TimePeriod) ?? TimePeriod.P1W),
          gqlAssetTypeToContract(type as ModelType),
          undefined,
          callOptions,
        );

        const tagsInsertPromise: Promise<void>[] = [];

        tags.forEach((tag) => {
          tagsInsertPromise.push(setResourceTagKeyValue(orgId, resource.id, tag.key, tag.value, callOptions));
        });

        await Promise.allSettled(tagsInsertPromise);

        return modelMetadataToModel(resource);
      } catch (err) {
        logger.error(
          err,
          'Failed to create model %s for org %s, type %s, timePeriod %s. Axios response: %s',
          orgId,
          type,
          timePeriod,
          formatAxiosError(err),
        );
      }
      return null;
    }),
  updateResource: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        timePeriod: z.string(),
        tags: tagsSchema,
        type: z.nativeEnum(ModelType).optional(),
      }),
    )
    .mutation(async ({ ctx, input: { id, name, timePeriod, tags, type, orgId } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);

      try {
        const resource = await updateModel(
          orgId,
          id,
          name,
          gqlTimePeriodToContract((timePeriod as TimePeriod) ?? TimePeriod.P1W),
          gqlAssetTypeToContract(type),
          callOptions,
        );

        // Fetch current tags and compare with the new tags
        const currentTags = await listResourceTags(orgId, id, callOptions);

        const tagsSetPromise: Promise<void>[] = [];
        const tagsDeletePromise: Promise<void>[] = [];

        const currentTagKeys = new Set<string>([]);

        // Loop over the current tags and compare with the new tags to determine which tags to delete
        currentTags.forEach((ct) => {
          // Store the current tags in a set for comparison later
          currentTagKeys.add(`${ct.key}:${ct.value}`);

          if (
            !tags.find((t) => {
              // If the tag is uncategorized, compare the value
              if (ct.key === NONE_TAGS_GROUP && t.key === NONE_TAGS_GROUP) {
                return ct.value === t.value;
              }
              return t.key === ct.key;
            })
          ) {
            // If the tag is not in the new tags, delete it
            tagsDeletePromise.push(deleteResourceTagKey(orgId, id, ct.key, ct.value, callOptions));
          }
        });

        // Set new tags
        tags.forEach((tag) => {
          // If the tag is not in the current tags, set it
          if (!currentTagKeys.has(`${tag.key}:${tag.value}`)) {
            tagsSetPromise.push(setResourceTagKeyValue(orgId, id, tag.key, tag.value, callOptions));
          }
        });

        await Promise.allSettled([...tagsSetPromise, ...tagsDeletePromise]);

        return modelMetadataToModel(resource);
      } catch (err) {
        logger.error(err, `Failed to update model ${id} for org ${orgId}, type ${type}, timePeriod ${timePeriod}`);
      }
      return null;
    }),
  deleteResource: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id } }) => {
      const response = await deactivateModel(orgId, id, callOptionsFromTrpcContext(ctx));

      return modelMetadataToModel(response);
    }),
  removeTag: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
        key: z.string(),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id: resourceId, key, value } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return deleteResourceTagKey(orgId, resourceId, key, value, callOptions);
    }),
  setTag: manageOrgProcedure
    .input(
      z.object({
        backgroundColor: z.string().nullish(),
        color: z.string().nullish(),
        id: z.string(),
        key: z.string(),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id: resourceId, key, value } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      return setResourceTagKeyValue(orgId, resourceId, key, value, callOptions);
    }),
});
