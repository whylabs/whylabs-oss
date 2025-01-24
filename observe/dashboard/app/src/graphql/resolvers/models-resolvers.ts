import { IResolvers } from '@graphql-tools/utils';

import { getLogger } from '../../providers/logger';
import { createModel, deactivateModel, updateModel } from '../../services/data/songbird/api-wrappers/resources';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { formatAxiosError } from '../../util/logging';
import { FullGraphQLContext } from '../context';
import {
  gqlAssetTypeToContract,
  gqlTimePeriodToContract,
  modelMetadataToModel,
} from '../contract-converters/songbird/model-converters';
import { Model, Resolvers, TimePeriod } from '../generated/graphql';

const logger = getLogger('ModelResolvers');

const resolvers: Resolvers<FullGraphQLContext> = {
  ModelManagement: {
    create: async (parent, args, context) => {
      const orgId = context.resolveUserOrgID();

      const model = await createModel(
        orgId,
        args.name,
        gqlTimePeriodToContract(args.timePeriod ?? TimePeriod.Unknown),
        gqlAssetTypeToContract(args.type),
        undefined,
        callOptionsFromGraphqlCxt(context),
      );

      return modelMetadataToModel(model);
    },
    createBulk: async (parent, { name, quantity, type, timePeriod }, context): Promise<Model[]> => {
      const orgId = context.resolveUserOrgID();

      logger.info(
        'Creating a batch of models of size %s for org %s, type %s, timePeriod %s',
        quantity,
        orgId,
        type,
        timePeriod,
      );

      // TODO: Probably needs better error handling
      const createdModels = await Promise.all(
        [...Array(quantity)].map(async (_, i) => {
          try {
            const modelName = quantity > 1 ? `${name}-${i}` : name;
            const model = await createModel(
              orgId,
              modelName,
              gqlTimePeriodToContract(timePeriod ?? TimePeriod.Unknown),
              gqlAssetTypeToContract(type),
              undefined,
              callOptionsFromGraphqlCxt(context),
            );

            return modelMetadataToModel(model);
          } catch (err) {
            logger.error(
              err,
              'Failed to create model %s for org %s, type %s, timePeriod %s. Axios response: %s',
              i,
              orgId,
              type,
              timePeriod,
              formatAxiosError(err),
            );
            return null;
          }
        }),
      );

      // filter out null models, if any models failed to be created
      const successfullyCreatedModels = createdModels.filter((m): m is Model => !!m);

      if (quantity && !successfullyCreatedModels.length) {
        throw Error(`Failed to create any models`);
      }

      return successfullyCreatedModels;
    },
    update: async (parent, args, context) => {
      const { id: modelId, name: modelName, type: modelType, timePeriod } = args.model;
      const orgId = context.resolveUserOrgID();

      const model = await updateModel(
        orgId,
        modelId,
        modelName,
        gqlTimePeriodToContract(timePeriod ?? TimePeriod.Unknown),
        gqlAssetTypeToContract(modelType),
        callOptionsFromGraphqlCxt(context),
      );

      return modelMetadataToModel(model);
    },
    delete: async (parent, args, context) => {
      const { id: modelId } = args;
      const orgId = context.resolveUserOrgID();

      const response = await deactivateModel(orgId, modelId, callOptionsFromGraphqlCxt(context));

      return modelMetadataToModel(response);
    },
    bulkUpdate: async (parent, args, context) => {
      const orgId = context.resolveUserOrgID();

      const updatedModels = await Promise.all(
        args.models.map(async ({ id, name, timePeriod, type }) => {
          try {
            const model = await updateModel(
              orgId,
              id,
              name,
              gqlTimePeriodToContract(timePeriod ?? TimePeriod.Unknown),
              gqlAssetTypeToContract(type),
              callOptionsFromGraphqlCxt(context),
            );

            return modelMetadataToModel(model);
          } catch (err) {
            logger.error(err, `Failed to update model ${id} for org ${orgId}, type ${type}, timePeriod ${timePeriod}`);
            return null;
          }
        }),
      );

      // Filters out null's
      return updatedModels.filter((model) => !!model) as Model[];
    },
  },
};

export default resolvers as IResolvers;
