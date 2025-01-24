import { useState } from 'react';
import {
  ActionType,
  DashbirdErrorCode,
  HeaderTuple,
  useCreateGlobalActionMutation,
  useDeleteGlobalActionMutation,
  useDisableGlobalActionMutation,
  useEnableGlobalActionMutation,
  useTestNotificationActionMutation,
  useUpdateGlobalActionMutation,
} from 'generated/graphql';
import { DashbirdError, getDashbirdErrors } from 'utils/error-utils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import {
  ActionFormValidator,
  getInputErrorMessage,
  OperationType,
  stringifyActionPayload,
  stringifyCustomWebhookPayload,
  successMessagesMapper,
  SupportedWebhookMethods,
} from '../globalActionUtils';

export interface HandleResponseProps {
  fallbackErrorMsg: string;
  response: { error: boolean; dashbirdError?: DashbirdError };
  type?: ActionType;
  operation?: OperationType;
  skipRefetch?: boolean;
}

type ActionFields =
  | {
      id: string;
      type: Exclude<ActionType, ActionType.Webhook>;
      action: string;
    }
  | {
      id: string;
      type: ActionType.Webhook;
      action: string;
      method: SupportedWebhookMethods;
      headers?: HeaderTuple[];
      body?: string;
    };
interface HandleActionRequestReturn {
  loadBlocker: boolean;
  toggleAction: (id: string, isEnabled: boolean) => Promise<boolean>;
  deleteAction: (id: string) => Promise<boolean>;
  testAction: (id: string, type: ActionType) => Promise<boolean>;
  updateAction: (props: ActionFields) => Promise<boolean>;
  createAction: (props: ActionFields) => Promise<boolean>;
  createOrUpdateAction: (props: ActionFields, isUpdate?: boolean) => Promise<boolean>;
}

interface HookProps {
  refetch?: () => void;
  setInputsValidation?: React.Dispatch<React.SetStateAction<ActionFormValidator>>;
}
export const useNotificationActionRequestHandler = ({
  refetch,
  setInputsValidation,
}: HookProps): HandleActionRequestReturn => {
  const [loadBlocker, setLoadBlocker] = useState<boolean>(false);
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const [deleteActionPayloadMutation] = useDeleteGlobalActionMutation();
  const [testNotificationMutation] = useTestNotificationActionMutation();
  const [enableActionMutation] = useEnableGlobalActionMutation();
  const [disableActionMutation] = useDisableGlobalActionMutation();
  const [updateActionMutation] = useUpdateGlobalActionMutation();
  const [createActionMutation] = useCreateGlobalActionMutation();

  const updateAction = (props: ActionFields) => {
    return createOrUpdateAction(props, true);
  };

  const createAction = (props: ActionFields) => {
    return createOrUpdateAction(props);
  };

  const createOrUpdateAction = async (props: ActionFields, update = false) => {
    setLoadBlocker(true);
    const { id, action, type } = props;
    const payload = (() => {
      if (props.type === ActionType.Webhook) {
        const { method, body, headers } = props;
        return stringifyCustomWebhookPayload({
          url: action,
          method,
          body,
          headers,
        });
      }
      return stringifyActionPayload(type, action);
    })();
    const mutation = update ? updateActionMutation : createActionMutation;
    const operation: OperationType = update ? 'update' : 'create';
    let response: HandleResponseProps['response'] = { error: false };
    const fallbackErrorMsg = `Error while attempting to ${operation} notification action ${id}`;
    try {
      await mutation({
        variables: { id, type, payload },
      });
    } catch (e) {
      response = handleCatch(e);
      console.log(response?.dashbirdError?.extensions?.safeErrorMsg || fallbackErrorMsg, e);
    }
    handleResponse({ fallbackErrorMsg, response, operation, type });
    return !response.error;
  };

  const toggleAction = async (id: string, isEnabled: boolean) => {
    setLoadBlocker(true);
    const toggleHandler = isEnabled ? disableActionMutation : enableActionMutation;
    let response: HandleResponseProps['response'] = { error: false };
    const fallbackErrorMsg = `Error while attempting to toggle notification action ${id}`;
    try {
      await toggleHandler({ variables: { id } });
    } catch (e) {
      response = handleCatch(e);
      console.log(response?.dashbirdError?.extensions?.safeErrorMsg || fallbackErrorMsg, e);
    }
    handleResponse({ fallbackErrorMsg, response, operation: 'update' });
    return !response.error;
  };

  const deleteAction = async (id: string) => {
    setLoadBlocker(true);
    let response: HandleResponseProps['response'] = { error: false };
    const fallbackErrorMsg = `Error while attempting to delete notification action ${id}`;
    try {
      await deleteActionPayloadMutation({ variables: { id } });
    } catch (e) {
      response = handleCatch(e);
      console.log(response?.dashbirdError?.extensions?.safeErrorMsg || fallbackErrorMsg, e);
    }
    handleResponse({ fallbackErrorMsg, response, operation: 'delete', skipRefetch: true });
    return !response.error;
  };

  const testAction = async (id: string, type: ActionType) => {
    setLoadBlocker(true);
    const fallbackErrorMsg = `Error while attempting to test notification action ${id}`;
    let response: HandleResponseProps['response'] = { error: false };
    try {
      await testNotificationMutation({ variables: { id } });
    } catch (e) {
      response = handleCatch(e);
      console.log(response?.dashbirdError?.extensions?.safeErrorMsg || fallbackErrorMsg, e);
    }
    handleResponse({ fallbackErrorMsg, response, type, skipRefetch: true });
    return !response.error;
  };

  const handleCatch = (error: unknown): HandleResponseProps['response'] => {
    const response: HandleResponseProps['response'] = { error: true };
    const dashbirdErrorArray = getDashbirdErrors(error);
    if (dashbirdErrorArray.length) {
      [response.dashbirdError] = dashbirdErrorArray;
    }
    return response;
  };

  const handleResponse = async ({
    fallbackErrorMsg,
    response,
    type,
    operation,
    skipRefetch = false,
  }: HandleResponseProps) => {
    let inputErrors: ActionFormValidator = {};
    if (response?.error) {
      const { extensions } = response.dashbirdError ?? {};
      const explanation = extensions?.safeErrorMsg || fallbackErrorMsg;
      enqueueErrorSnackbar({ explanation, err: null, autoClose: 10 });
      inputErrors = getInputErrorMessage(
        extensions?.code ?? DashbirdErrorCode.GenericError,
        type,
        extensions?.parameter ?? '',
      );
    } else {
      const title = successMessagesMapper.get(operation ?? type);
      if (title) {
        enqueueSnackbar({ title });
      }
    }
    setInputsValidation?.(inputErrors);
    if (!skipRefetch && refetch) await refetch();
    setLoadBlocker(false);
  };
  return {
    loadBlocker,
    toggleAction,
    deleteAction,
    updateAction,
    createAction,
    createOrUpdateAction,
    testAction,
  };
};
