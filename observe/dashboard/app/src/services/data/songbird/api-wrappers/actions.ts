import { ActionType, NotificationAction } from '@whylabs/songbird-node-client';

import { GenericDashbirdError } from '../../../../errors/dashbird-error';
import { DashbirdErrorCode } from '../../../../graphql/generated/graphql';
import { SongbirdErrorBody } from '../../../../services/data/songbird/api-wrappers/utils';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { WhyLabsErrorType, getErrorParameter, getErrorType, isAxiosError } from '../../../../util/logging';
import { songbirdClient } from '../songbird-client-factory';
import { logger } from './utils';

const getCustomErrorMessage = (errorBody?: SongbirdErrorBody, actionType?: ActionType): string => {
  if (!errorBody) return '';
  const { type: errorType, parameter } = errorBody;
  if (errorType === 'ResourceAlreadyExists') {
    return 'Action ID %actionId cannot be the same as a previously used or deleted action. Please update and try again.';
  }
  if (errorType === 'ResourceConstraint') {
    return "The notification action %actionId can't be deleted because it's being used by monitors. Remove the action from those monitors and try again.";
  }
  if (['ArgumentValue', 'IllegalArgument'].includes(errorType ?? '')) {
    if (parameter === 'actionId') return 'Invalid action ID. Only alphanumeric, dash, and underscore are allowed.';
    switch (actionType) {
      case ActionType.Email:
        return 'Only one email permitted. Please check for typos and remove any additional emails.';
      case ActionType.Slack:
      case ActionType.Teams:
        return 'Only one webhook permitted. Please check for typos and remove any additional webhooks.';
      case ActionType.PagerDuty:
        return 'Only one secret key permitted. Please check for typos and remove any additional keys.';
      case ActionType.Webhook:
        return 'Only one webhook url permitted. Please check for typos and remove any additional webhooks.';
      default:
        return 'Only one action  permitted. Please check for typos and remove any additional values.';
    }
  }
  return '';
};

const errorMapper = new Map<WhyLabsErrorType, DashbirdErrorCode>([
  ['IllegalArgument', DashbirdErrorCode.IllegalArgument],
  ['ResourceAlreadyExists', DashbirdErrorCode.ResourceAlreadyExists],
  ['ArgumentValue', DashbirdErrorCode.ArgumentValue],
]);

export const handleSongBirdError = (err: unknown, fallbackMessage: string, type?: ActionType, id = ''): void => {
  if (!isAxiosError(err)) {
    logger.error(err, 'Unknown error when calling Songbird');
    throw err;
  }
  logger.info(fallbackMessage);
  const { message } = err?.response?.data ?? {};
  const errorType = getErrorType(err);
  const parameter = getErrorParameter(err);
  const customMessage = getCustomErrorMessage(err?.response?.data, type).replace('%actionId', id) || message;
  const songBirdError = errorType && errorMapper.get(errorType);
  throw new GenericDashbirdError(customMessage || fallbackMessage, songBirdError, parameter);
};

/**
 * Send a test  notification for a given action
 * @param orgId The org
 * @param actionId The action
 */
export const testGlobalAction = async (
  orgId: string,
  actionId: string,
  options?: CallOptions,
): Promise<object | null> => {
  logger.info('Testing global action %s for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryCall(() => client.notifications.testNotificationAction(orgId, actionId, axiosCallConfig(options)), options);
};
/**
 * Fetches global actions for an org
 * @param orgId The org
 */
export const listGlobalActions = async (orgId: string, options?: CallOptions): Promise<NotificationAction[] | null> => {
  logger.info('Listing global actions for org %s', orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.notifications.listNotificationActions(orgId, axiosCallConfig(options)),
    options,
  );
  return response.data ?? null;
};
/**
 * Find global action for an org by actionId
 * @param orgId The org
 * @param actionId The action
 */
export const findGlobalAction = async (
  orgId: string,
  actionId: string,
  options?: CallOptions,
): Promise<NotificationAction | null> => {
  logger.info('Getting global action %s for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () => client.notifications.getNotificationAction(orgId, actionId, axiosCallConfig(options)),
    options,
  );
  return response.data ?? null;
};
/**
 * Create global action for an org
 * @param orgId The org
 * @param actionId The action
 * @param type Type of global action
 * @param action The payload action string
 */
export const createGlobalAction = async (
  orgId: string,
  actionId: string,
  type: ActionType,
  action: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Creating notification action for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(
    () => client.notifications.addNotificationAction(orgId, type, actionId, action, axiosCallConfig(options)),
    options,
  );
};
/**
 * Enable global action for an org
 * @param orgId The org
 * @param actionId The action
 */
export const enableGlobalAction = async (orgId: string, actionId: string, options?: CallOptions): Promise<void> => {
  logger.info('Enabling notification action for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(
    () => client.notifications.enableNotificationAction(orgId, actionId, axiosCallConfig(options)),
    options,
  );
};
/**
 * Disable global action for an org
 * @param orgId The org
 * @param actionId The action
 */
export const disableGlobalAction = async (orgId: string, actionId: string, options?: CallOptions): Promise<void> => {
  logger.info('Disabling notification action for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(
    () => client.notifications.disableNotificationAction(orgId, actionId, axiosCallConfig(options)),
    options,
  );
};
/**
 * Updates global action for an org
 * @param orgId The org
 * @param actionId The action
 * @param type Type of global action
 * @param action The payload action string
 */
export const updateGlobalAction = async (
  orgId: string,
  actionId: string,
  type: ActionType,
  action: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Updating %s notification action for org %s', actionId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(
    () => client.notifications.updateNotificationAction(orgId, type, actionId, action, axiosCallConfig(options)),
    options,
  );
};
/**
 * Mark a global action as deleted for an org
 * @param orgId The org
 * @param actionId The action
 */
export const deleteGlobalAction = async (orgId: string, actionId: string, options?: CallOptions): Promise<void> => {
  logger.info('Deleting notification settings for org %s', orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryCall(
    () => client.notifications.deleteNotificationAction(orgId, actionId, axiosCallConfig(options)),
    options,
  );
};
