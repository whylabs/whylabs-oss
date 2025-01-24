import { z } from 'zod';

import {
  gqlToSongbirdActionType,
  transformToGenericAction,
} from '../../../graphql/contract-converters/songbird/global-actions-converter';
import { ActionType, GenericNotificationAction, SortDirection } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
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
} from '../../../services/data/songbird/api-wrappers/actions';
import { sortAsc, sortDesc } from '../../../util/misc';
import { manageOrgProcedure, router } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { createSortBySchema, sortDirectionSchema } from '../../util/schemas';
import { NotificationsOrderByEnum } from './types/NotificationsTypes';

export type IntegrationCardType = {
  coming_soon: boolean;
  description: string;
  title: string;
  logo: string;
  url: string;
  category: string;
};

const logger = getLogger('trpc notification settings router logger');

const getActionDisplayName = (actionType: ActionType): string => {
  switch (actionType) {
    case 'EMAIL':
      return 'Email';
    case 'PAGER_DUTY':
      return 'PagerDuty message';
    case 'SLACK':
      return 'Slack message';
    case 'TEAMS':
      return 'MS Teams message';
    case 'WEBHOOK':
      return 'Custom webhook';
    default:
      return 'Not defined';
  }
};

export const notifications = router({
  listNotifications: manageOrgProcedure
    .input(
      z
        .object({
          sortBy: createSortBySchema(NotificationsOrderByEnum, 'LastUpdated'),
        })
        .merge(sortDirectionSchema),
    )
    .query(async ({ ctx, input: { orgId, sortDirection, sortBy } }): Promise<GenericNotificationAction[]> => {
      const globalActions = await listGlobalActions(orgId, callOptionsFromTrpcContext(ctx));

      if (!globalActions) return [];

      const castedArray = globalActions?.map((action) => transformToGenericAction(action));

      castedArray.sort((a, b) => {
        const isAscDirection = sortDirection === SortDirection.Asc;
        const sortFn = isAscDirection ? sortAsc : sortDesc;

        switch (sortBy) {
          case NotificationsOrderByEnum.Id:
            return sortFn(a.id, b.id);

          case NotificationsOrderByEnum.Action:
            if (!a.type) return b.type ? 1 : 0;
            if (!b.type) return a.type ? -1 : 0;
            return sortFn(getActionDisplayName(a.type), getActionDisplayName(b.type));

          case NotificationsOrderByEnum.CreationTime:
            if (!a.createdAt) {
              if (isAscDirection) return b.createdAt ? 1 : 0;
              return b.createdAt ? -1 : 0;
            }
            if (!b.createdAt) {
              if (isAscDirection) return a.createdAt ? -1 : 0;
              return a.createdAt ? 1 : 0;
            }
            return sortFn(a.createdAt, b.createdAt);

          default:
            return 0;
        }
      });

      return castedArray;
    }),
  findNotification: manageOrgProcedure
    .input(
      z.object({
        notificationId: z.string(),
      }),
    )
    .query(async ({ ctx, input: { orgId, notificationId } }): Promise<GenericNotificationAction | null> => {
      const globalAction = await findGlobalAction(orgId, notificationId, callOptionsFromTrpcContext(ctx));
      if (!globalAction) return null;
      transformToGenericAction();

      return transformToGenericAction(globalAction);
    }),
  createNotifications: manageOrgProcedure
    .input(
      z.object({
        action: z.string(),
        id: z.string(),
        type: z.nativeEnum(ActionType),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, action, id, type } }): Promise<boolean> => {
      logger.info('Creating global action %s for org %s', id, orgId);
      try {
        const songbirdActionType = gqlToSongbirdActionType(type);
        await createGlobalAction(orgId, id, songbirdActionType, action, callOptionsFromTrpcContext(ctx));
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
    }),
  updateNotifications: manageOrgProcedure
    .input(
      z.object({
        action: z.string(),
        id: z.string(),
        type: z.nativeEnum(ActionType),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, action, id, type } }): Promise<boolean> => {
      logger.info('Updating global action %s for org %s', id, orgId);
      try {
        const songbirdActionType = gqlToSongbirdActionType(type);
        await updateGlobalAction(orgId, id, songbirdActionType, action, callOptionsFromTrpcContext(ctx));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when updating notification action ${id} for org ${orgId}: could not persist action settings`,
          type,
          id,
        );
        return false;
      }
    }),
  deleteNotifications: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id } }): Promise<boolean> => {
      logger.info('Deleting global action %s for org %s', id, orgId);
      try {
        await deleteGlobalAction(orgId, id, callOptionsFromTrpcContext(ctx));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when deleting notification action ${id} for org ${orgId}: could not persist action settings`,
          undefined,
          id,
        );
        return false;
      }
    }),
  testNotifications: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(ActionType),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id, type } }): Promise<boolean> => {
      logger.info('Updating global action %s for org %s', id, orgId);
      try {
        await testGlobalAction(orgId, id, callOptionsFromTrpcContext(ctx));
        return true;
      } catch (err) {
        handleSongBirdError(
          err,
          `Something went wrong when testing notification action ${id} for org ${orgId}.`,
          type,
          id,
        );
        return false;
      }
    }),
  enableNotification: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id } }): Promise<boolean> => {
      logger.info('Enabling global action %s for org %s', id, orgId);
      try {
        await enableGlobalAction(orgId, id, callOptionsFromTrpcContext(ctx));

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
    }),
  disableNotification: manageOrgProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { orgId, id } }): Promise<boolean> => {
      logger.info('Disabling global action %s for org %s', id, orgId);

      try {
        await disableGlobalAction(orgId, id, callOptionsFromTrpcContext(ctx));
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
    }),
});
