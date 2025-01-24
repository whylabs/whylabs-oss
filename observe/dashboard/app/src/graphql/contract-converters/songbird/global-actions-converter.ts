import {
  NotificationAction,
  ActionType as SongbirdActionType,
  NotificationRelationshipType as SongbirdNotificationRelationshipType,
} from '@whylabs/songbird-node-client';

import { NotificationAction as GQLNotificationAction, HeaderTuple } from '../../generated/graphql';
import { ActionType, GenericNotificationAction, NotificationRelationshipType } from '../../generated/graphql';

const actionTypeToGql = (type: SongbirdActionType): ActionType => {
  switch (type) {
    case SongbirdActionType.PagerDuty:
      return ActionType.PagerDuty;
    case SongbirdActionType.Email:
      return ActionType.Email;
    case SongbirdActionType.Slack:
      return ActionType.Slack;
    case SongbirdActionType.Teams:
      return ActionType.Teams;
    case SongbirdActionType.Webhook:
      return ActionType.Webhook;
    default:
      return ActionType.Na;
  }
};

export const gqlToSongbirdActionType = (type: ActionType): SongbirdActionType => {
  switch (type) {
    case ActionType.PagerDuty:
      return SongbirdActionType.PagerDuty;
    case ActionType.Email:
      return SongbirdActionType.Email;
    case ActionType.Slack:
      return SongbirdActionType.Slack;
    case ActionType.Teams:
      return SongbirdActionType.Teams;
    case ActionType.Webhook:
      return SongbirdActionType.Webhook;
    default:
      return SongbirdActionType.Na;
  }
};

const relationshipTypeToGql = (
  type: SongbirdNotificationRelationshipType | null | undefined,
): NotificationRelationshipType | undefined => {
  return type === SongbirdNotificationRelationshipType.Monitor ? NotificationRelationshipType.Monitor : undefined;
};

const handlePayload = (notificationAction: NotificationAction): GQLNotificationAction => {
  const headers: HeaderTuple[] | undefined = (() => {
    if ('headers' in notificationAction.payload) {
      return Object.entries(notificationAction.payload.headers).map(([key, value]) => ({
        key,
        value,
      }));
    }
    return undefined;
  })();
  return { ...notificationAction.payload, headers };
};

export const transformToGenericAction = (notificationAction?: NotificationAction): GenericNotificationAction => {
  return {
    id: notificationAction?.id ?? '',
    type: notificationAction?.type ? actionTypeToGql(notificationAction?.type) : ActionType.Na,
    payload: notificationAction ? handlePayload(notificationAction) : {},
    enabled: !!notificationAction?.enabled,
    references: notificationAction?.references?.map((r) => ({ ...r, type: relationshipTypeToGql(r.type) })),
    createdAt: new Date(notificationAction?.creationTime ?? 0).getTime(),
    updatedAt: new Date(notificationAction?.lastUpdate ?? 0).getTime(),
  };
};
