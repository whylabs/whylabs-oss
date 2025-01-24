import { IResolvers } from '@graphql-tools/utils';

import { getLogger } from '../../providers/logger';
import {
  createGlobalAction,
  deleteGlobalAction,
  disableGlobalAction,
  enableGlobalAction,
  findGlobalAction,
  handleSongBirdError,
  listGlobalActions,
  testGlobalAction,
  updateGlobalAction,
} from '../../services/data/songbird/api-wrappers/actions';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { FullGraphQLContext } from '../context';
import {
  gqlToSongbirdActionType,
  transformToGenericAction,
} from '../contract-converters/songbird/global-actions-converter';
import {
  CustomWebhookAction,
  EmailAction,
  GenericNotificationAction,
  MsTeamsAction,
  PagerDutyAction,
  Resolvers,
  SlackAction,
  UnknownAction,
} from '../generated/graphql';

const logger = getLogger('NotificationResolvers');

const resolvers: Resolvers<FullGraphQLContext> = {
  SlackAction: {
    __isTypeOf: (obj): obj is SlackAction => {
      return 'slackWebhook' in obj;
    },
  },
  MSTeamsAction: {
    __isTypeOf: (obj): obj is MsTeamsAction => {
      return 'webhook' in obj;
    },
  },
  EmailAction: {
    __isTypeOf: (obj): obj is EmailAction => {
      return 'email' in obj;
    },
  },
  PagerDutyAction: {
    __isTypeOf: (obj): obj is PagerDutyAction => {
      return 'pagerDutyKey' in obj;
    },
  },
  CustomWebhookAction: {
    __isTypeOf: (obj): obj is CustomWebhookAction => {
      return 'url' in obj && 'method' in obj;
    },
  },
  UnknownAction: {
    __isTypeOf: (obj): obj is UnknownAction => {
      return (
        !('slackWebhook' in obj) &&
        !('webhook' in obj) &&
        !('email' in obj) &&
        !('pagerDutyKey' in obj) &&
        !('url' in obj)
      );
    },
  },
  GlobalActionsFetching: {
    listGlobalActions: async (_, args, context): Promise<GenericNotificationAction[]> => {
      const orgId = context.resolveUserOrgID();
      const globalActions = await listGlobalActions(orgId, callOptionsFromGraphqlCxt(context));
      const castedArray = globalActions
        ?.map((action) => transformToGenericAction(action))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      return castedArray ?? [];
    },
    findGlobalAction: async (_, { id }, context): Promise<GenericNotificationAction | null> => {
      const orgId = context.resolveUserOrgID();
      const globalAction = await findGlobalAction(orgId, id, callOptionsFromGraphqlCxt(context));
      if (!globalAction) return null;
      return transformToGenericAction(globalAction);
    },
  },
  GlobalActionsManagement: {
    testGlobalAction: async (_, { id }, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      try {
        await testGlobalAction(orgId, id, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when testing notification action ${id} for org ${orgId}`,
          undefined,
          id,
        );
        return false;
      }
    },
    createGlobalAction: async (_, args, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      const { id, type, action } = args;
      logger.info('Updating global action %s for org %s', id, orgId);
      try {
        const songbirdActionType = gqlToSongbirdActionType(type);
        await createGlobalAction(orgId, id, songbirdActionType, action, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when creating notification action ${id} for org ${orgId}: could not persist action settings`,
          type,
          id,
        );
        return false;
      }
    },
    updateGlobalAction: async (_, args, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      const { id, type, action } = args;
      logger.info('Updating global action %s for org %s', id, orgId);
      try {
        const songbirdActionType = gqlToSongbirdActionType(type);
        await updateGlobalAction(orgId, id, songbirdActionType, action, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when updating notification action ${id} for org ${orgId}: could not persist or read updated settings`,
          type,
          id,
        );
        return false;
      }
    },
    enableGlobalAction: async (_, args, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      const { id } = args;
      logger.info('Enabling global action %s for org %s', id, orgId);
      try {
        await enableGlobalAction(orgId, id, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when enabling notification action ${id} for org ${orgId}: could not persist or read updated settings`,
          undefined,
          id,
        );
        return false;
      }
    },
    disableGlobalAction: async (_, args, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      const { id } = args;
      logger.info('Disabling global action %s for org %s', id, orgId);
      try {
        await disableGlobalAction(orgId, id, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when disabling notification action ${id} for org ${orgId}: could not persist or read updated settings`,
          undefined,
          id,
        );
        return false;
      }
    },
    deleteGlobalAction: async (_, args, context): Promise<boolean> => {
      const orgId = context.resolveUserOrgID();
      const { id } = args;
      logger.info('Deleting global action %s for org %s', id, orgId);
      try {
        await deleteGlobalAction(orgId, id, callOptionsFromGraphqlCxt(context));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when updating notification action ${id} for org ${orgId}: could not persist or read updated settings`,
          undefined,
          id,
        );
        return false;
      }
    },
  },
};

export default resolvers as IResolvers;
