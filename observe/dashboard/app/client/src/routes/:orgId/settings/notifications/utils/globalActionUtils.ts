import { ActionType } from '@whylabs/songbird-node-client';
import {
  CustomWebhookAction,
  DashbirdErrorCode,
  EmailAction,
  GenericNotificationAction,
  HeaderTuple,
  MsTeamsAction,
  PagerDutyAction,
  SlackAction,
} from '~server/graphql/generated/graphql';

export type OperationType = 'create' | 'update' | 'delete';
export type MessagesOptions = OperationType | `${ActionType}`;
export const testNotificationMessagesMapper = new Map<MessagesOptions | undefined, string>([
  ['EMAIL', 'Check email for your test message'],
  ['SLACK', 'Check Slack for your test message'],
  ['TEAMS', 'Check Microsoft Teams for your test message'],
  ['PAGER_DUTY', 'Check PagerDuty for your test message'],
  ['WEBHOOK', 'Check integration for your test message'],
]);

export interface ActionFormValidator {
  id?: string;
  action?: string;
}

export const getInputErrorMessage = (
  code: DashbirdErrorCode,
  type?: ActionType,
  param?: string,
): ActionFormValidator => {
  const actionObject = ACTION_TYPES.find(({ type: actionType }) => type === actionType);
  if (param === 'actionId' || code === 'RESOURCE_ALREADY_EXISTS') {
    return { id: code === 'RESOURCE_ALREADY_EXISTS' ? 'Provide a new unique name' : 'Invalid action ID' };
  }
  if (code === 'ARGUMENT_VALUE') {
    return { action: `${actionObject?.label ?? 'Field value'} is invalid` };
  }
  return {};
};

export const extractExtraWebhookFieldsFromPayload = (
  action?: GenericNotificationAction | null,
): CustomWebhookAction | null => {
  if (action?.type !== 'WEBHOOK' || !action.payload) return null;

  if ('url' in action.payload) {
    return action.payload;
  }

  return null;
};

export const extractActionFromPayload = (action: GenericNotificationAction | undefined): string => {
  if (!action || !action.payload) return '';

  if ('slackWebhook' in action.payload) {
    return action.payload.slackWebhook ?? '';
  }
  if ('email' in action.payload) {
    return action.payload.email ?? '';
  }
  if ('webhook' in action.payload) {
    return action.payload.webhook ?? '';
  }
  if ('pagerDutyKey' in action.payload) {
    return action.payload.pagerDutyKey ?? '';
  }
  if ('url' in action.payload) {
    return action.payload.url ?? '';
  }

  return '';
};

export const defaultWebhookBody = `{
  "orgId": "<[[org-id]]>",
  "datasetId": "<[[dataset-id]]>",
  "monitorId": "<[[monitor-id]]>",
  "monitorName": "<[[monitor-name]]>",
  "runId": "<[[run-id]]>"
}`;

export const HTTP_METHODS = ['Post', 'Put', 'Patch'] as const;
export type SupportedWebhookMethods = (typeof HTTP_METHODS)[number];

export const translateHeaderEntriesToMap = (headers: HeaderTuple[]): Record<string, string> => {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]) ?? []);
};
export const stringifyCustomWebhookPayload = ({
  url,
  body,
  headers,
  method,
}: {
  url: string;
  method: SupportedWebhookMethods;
  headers?: HeaderTuple[];
  body?: string;
}): string => {
  const songbirdHeaderFormat = translateHeaderEntriesToMap(headers ?? []);
  return JSON.stringify({
    url: url.trim(),
    method: method.toUpperCase(),
    body: body || null,
    headers: songbirdHeaderFormat,
  });
};

export const stringifyActionPayload = (type: ActionType, action: string): string => {
  if (type === ActionType.Slack) {
    const payload: SlackAction = {
      slackWebhook: action,
    };
    return JSON.stringify(payload);
  }
  if (type === ActionType.Teams) {
    const payload: MsTeamsAction = {
      webhook: action,
    };
    return JSON.stringify(payload);
  }
  if (type === ActionType.Email) {
    const payload: EmailAction = {
      email: action,
    };
    return JSON.stringify(payload);
  }
  if (type === ActionType.PagerDuty) {
    const payload: PagerDutyAction = {
      pagerDutyKey: action,
    };
    return JSON.stringify(payload);
  }
  return '';
};

export const ACTION_TYPES = [
  // ActionType.Na should not be mapped here
  {
    type: ActionType.Email,
    name: 'Email',
    displayText: 'Email',
    label: 'Recipient email',
    detailsLabel: 'Email',
    placeholder: 'Provide an email address',
    bottomText: 'One email address only, best practice is to use groups emails for notifications',
    routePath: 'email',
  },
  {
    type: ActionType.Slack,
    name: 'Slack',
    displayText: 'Slack message',
    label: 'Slack webhook',
    detailsLabel: 'Slack webhook',
    placeholder: 'Provide a valid Slack webhook',
    bottomText: null,
    routePath: 'slack',
  },
  {
    type: ActionType.Teams,
    name: 'Microsoft Teams',
    displayText: 'MS Teams message',
    label: 'Microsoft Teams webhook',
    detailsLabel: 'Microsoft Teams webhook',
    placeholder: 'Provide a valid Microsoft Teams webhook',
    bottomText: null,
    routePath: 'teams',
  },
  {
    type: ActionType.PagerDuty,
    name: 'PagerDuty',
    displayText: 'PagerDuty message',
    label: 'PagerDuty secret key',
    detailsLabel: 'PagerDuty secret key',
    placeholder: 'Provide a valid PagerDuty secret key',
    bottomText: null,
    routePath: 'pager-duty',
  },
  {
    type: ActionType.Webhook,
    name: 'Webhook',
    displayText: 'Custom webhook',
    label: 'Custom webhook url',
    detailsLabel: 'Webhook url',
    placeholder: 'Provide a valid webhook url',
    bottomText: null,
    routePath: 'webhook',
  },
] as const;

export type ActionOption = (typeof ACTION_TYPES)[number];
export type ActionRoutePath = (typeof ACTION_TYPES)[number]['routePath'];
export type ActionsSortBy = 'ActionType' | 'ActionID' | 'Enabled' | 'CreatedAt' | 'UpdatedAt';

export const UNSUPPORTED_ACTIONS = [ActionType.Na];

export const actionSelectOptions: { label: string; value: ActionType }[] = [...ACTION_TYPES].map(({ type, name }) => {
  return { label: name, value: type };
});

export const translateStringToAvailableMethod = (method?: string): SupportedWebhookMethods | undefined => {
  if (!method) return undefined;
  return HTTP_METHODS.find((availableMethod) => availableMethod.toLowerCase() === method.toLowerCase());
};

export const normalizeType = (type: ActionType): ActionRoutePath => {
  return type.toLocaleLowerCase().replaceAll('_', '-') as ActionRoutePath;
};
