import { useListState } from '@mantine/hooks';
import { ActionType, ModelType } from '@whylabs/songbird-node-client';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useOrgId } from '~/hooks/useOrgId';
import useSearchText from '~/hooks/useSearchText';
import useSort from '~/hooks/useSort';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { SortByKeys, SortDirectionKeys, SortDirectionType, SortType } from '~/types/sortTypes';
import { generateFriendlyName } from '~/utils/friendlyNames';
import { EDITING_KEY } from '~/utils/searchParamsConstants';
import { RouterOutputs, trpc } from '~/utils/trpc';
import { HeaderTuple } from '~server/graphql/generated/graphql';
import { NotificationsOrderByEnum } from '~server/trpc/meta/notifications/types/NotificationsTypes';
import LogRocket from 'logrocket';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRevalidator, useSearchParams } from 'react-router-dom';

import {
  ACTION_TYPES,
  ActionFormValidator,
  HTTP_METHODS,
  SupportedWebhookMethods,
  actionSelectOptions,
  extractExtraWebhookFieldsFromPayload,
  stringifyActionPayload,
  stringifyCustomWebhookPayload,
  testNotificationMessagesMapper,
  translateStringToAvailableMethod,
} from './utils/globalActionUtils';

type ListNotificationsReturnType = RouterOutputs['meta']['notifications']['listNotifications'] | undefined;
const MUTATION_RETRY_COUNT = 3;

export const useNotificationsViewModel = () => {
  const orgId = useOrgId();
  const { notificationActionId } = useParams<{ orgId: string; notificationActionId: string }>();
  const trpcUtils = trpc.useUtils();
  const listNotificationsEndpoint = trpcUtils.meta.notifications.listNotifications;

  const { setSort, sortBy, sortDirection } = useSort<NotificationsOrderByEnum>({
    sortByKey: SortByKeys.sortActionsBy,
    sortDirectionKey: SortDirectionKeys.sortActionsDirection,
  });
  const { searchText, debouncedSearchText, setSearchText } = useSearchText();

  const { getNavUrl, handleNavigation } = useNavLinkHandler();

  const [inputsValidation, setInputsValidation] = useState<ActionFormValidator>({});
  const [isDeleteModelOpen, setIsDeleteModelOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const formRef = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement | null>>(new Map());
  const revalidator = useRevalidator();

  const FETCHING_ERROR_MESSAGE = 'An error occurred while fetching data';

  const queryVariables = {
    orgId,
    sortBy,
    sortDirection,
  };
  const {
    data: organizationActions,
    isLoading,
    error: listingNotificationsError,
  } = trpc.meta.notifications.listNotifications.useQuery(queryVariables);

  /** Cancel any outgoing refetches (so they don't overwrite our optimistic update) */
  const cancelRefetches = listNotificationsEndpoint.cancel;

  const refetchNotifications = () => {
    listNotificationsEndpoint.invalidate(queryVariables, undefined, {
      // Prevent refetching the data if the query is already fetching
      cancelRefetch: false,
    });
  };

  const setListNotificationsData = (
    list: ListNotificationsReturnType | ((old: ListNotificationsReturnType) => ListNotificationsReturnType),
  ) => {
    listNotificationsEndpoint.setData(queryVariables, list);
  };

  const createNotificationMutation = trpc.meta.notifications.createNotifications.useMutation({
    onSettled: refetchNotifications,
  });
  const updateNotificationMutation = trpc.meta.notifications.updateNotifications.useMutation({
    onSettled: refetchNotifications,
  });
  const deleteNotificationMutation = trpc.meta.notifications.deleteNotifications.useMutation({
    onSettled: refetchNotifications,
  });

  const enableNotificationMutation = trpc.meta.notifications.enableNotification.useMutation({
    onMutate: async ({ id: updatedId }) => {
      // trpcUtils.meta.notifications.

      await cancelRefetches();

      // Snapshot the previous value
      const snapshot = listNotificationsEndpoint.getData();

      setListNotificationsData((prevData) =>
        prevData?.map((n) => {
          // Optimistically enable the notification
          if (n.id === updatedId) return { ...n, enabled: true };
          return n;
        }),
      );

      // Return a context object with the snapshotted value
      return { snapshot };
    },
    onError: (_err, _newTodo, context) => {
      // Rollback to the previous value if mutation fails
      setListNotificationsData(context?.snapshot);
    },
    retry: MUTATION_RETRY_COUNT,
  });
  const disableNotificationMutation = trpc.meta.notifications.disableNotification.useMutation({
    onMutate: async ({ id: updatedId }) => {
      await cancelRefetches();

      // Snapshot the previous value
      const snapshot = listNotificationsEndpoint.getData();

      setListNotificationsData((prevData) =>
        prevData?.map((n) => {
          // Optimistically disable the notification
          if (n.id === updatedId) return { ...n, enabled: false };
          return n;
        }),
      );

      // Return a context object with the snapshotted value
      return { snapshot };
    },
    onError: (_err, _newTodo, context) => {
      // Rollback to the previous value if mutation fails
      setListNotificationsData(context?.snapshot);
    },
    retry: MUTATION_RETRY_COUNT,
  });

  const testNotificationMutation = trpc.meta.notifications.testNotifications.useMutation();
  const { data: resources, isLoading: isResourcesLoading } = trpc.meta.resources.list.useQuery({
    orgId,
  });

  const { isSaving: isCreatingNotification, asyncCall: createNotificationMutationAsyncCall } = useMutationProperties({
    mutation: createNotificationMutation,
    revalidator,
  });
  const { isSaving: isUpdatingNotification, asyncCall: updateNotificationMutationAsyncCall } = useMutationProperties({
    mutation: updateNotificationMutation,
    revalidator,
  });
  const { asyncCall: deleteNotificationMutationAsyncCall } = useMutationProperties({
    mutation: deleteNotificationMutation,
    revalidator,
  });
  const { asyncCall: enableNotificationMutationAsyncCall } = useMutationProperties({
    mutation: enableNotificationMutation,
    revalidator,
  });
  const { asyncCall: disableNotificationMutationAsyncCall } = useMutationProperties({
    mutation: disableNotificationMutation,
    revalidator,
  });
  const { asyncCall: testNotificationMutationAsyncCall } = useMutationProperties({
    mutation: testNotificationMutation,
    revalidator,
  });

  const actionDetails = organizationActions?.find((action) => action.id === notificationActionId) ?? null;

  const actionNotFound = !isLoading && !actionDetails;

  interface RelatedMonitors {
    resourceId: string;
    resourceName: string;
    type: ModelType | string;
    monitors: { id: string; displayName?: string | null }[];
  }

  const relatedMonitors = useMemo(() => {
    if (!resources) return [];

    const aggregation = new Map<string, RelatedMonitors>([]);
    actionDetails?.references?.forEach((item) => {
      const { modelType, name } = resources.find(({ id }) => id === item?.datasetId) ?? {};
      if (!item?.itemId || !item.datasetId || item.type !== 'MONITOR') return;
      const { itemId, datasetId, itemDisplayName } = item;
      const current = aggregation.get(datasetId);
      const relations: RelatedMonitors = {
        resourceId: datasetId,
        resourceName: name ?? datasetId,
        type: modelType ?? ModelType.Classification,
        monitors: [...(current?.monitors ?? []), { id: itemId, displayName: itemDisplayName }],
      };
      aggregation.set(datasetId, relations);
    });
    return [...aggregation.values()];
  }, [resources, actionDetails?.references]);

  const getActionDisplayName = (actionType: ActionType) => {
    return ACTION_TYPES.find(({ type }) => actionType === type)?.displayText;
  };

  const getActionDetailsLabel = (actionType: ActionType) => {
    return ACTION_TYPES.find(({ type }) => actionType === type)?.detailsLabel ?? 'Action details';
  };

  const filteredData = (() => {
    if (!organizationActions) return [];
    if (organizationActions.length === 1) return organizationActions;

    if (!debouncedSearchText) return organizationActions;

    return organizationActions.filter(({ id, type }) => {
      const lowerCaseSearchText = debouncedSearchText.toLowerCase();

      const matchId = id.toLowerCase().includes(lowerCaseSearchText);
      const matchAction = getActionDisplayName(type)?.toLowerCase().includes(lowerCaseSearchText);

      return matchId || matchAction;
    });
  })();

  const notificationsList = (() => {
    if (actionDetails) return [actionDetails];

    return filteredData;
  })();

  const hasData = notificationsList && !!notificationsList.length;
  const rowsCount = notificationsList && notificationsList.length;
  const tableRowsCount = isLoading ? 0 : rowsCount || 0;

  const editingActionId = searchParams.get(EDITING_KEY);
  const editingAction = organizationActions?.find(({ id }) => id === editingActionId);

  const [selectedAction, setSelectedAction] = useState<ActionType>(actionSelectOptions[0]?.value);

  useEffect(() => {
    if (!editingAction) return;

    setSelectedAction(editingAction?.type);
  }, [editingAction]);

  const defaultWebhookFields = extractExtraWebhookFieldsFromPayload(editingAction);
  const [selectedMethod, setSelectedMethod] = useState<SupportedWebhookMethods>(
    translateStringToAvailableMethod(defaultWebhookFields?.method) ?? HTTP_METHODS[0],
  );

  const [headers, headersHandlers] = useListState<string>(
    (() => {
      if (defaultWebhookFields?.headers?.length)
        return defaultWebhookFields.headers.map(({ key, value }) => `${key}-${value}`);
      return [generateFriendlyName()];
    })(),
  );

  const getValidHeaders = (): HeaderTuple[] => {
    return headers.flatMap((id) => {
      const headerKey = formRef.current.get(`${id}--key`)?.value;
      const headerValue = formRef.current.get(`${id}--value`)?.value;
      if (headerKey && headerValue) return [{ key: headerKey, value: headerValue }];
      return [];
    });
  };

  const handleNewActionClick = () => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(EDITING_KEY, 'new-action');
      return nextSearchParams;
    });
  };

  const handleClose = () => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(EDITING_KEY);
      return nextSearchParams;
    });
  };

  const handleEdit = (id: string) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(EDITING_KEY, id);
      return nextSearchParams;
    });
  };

  const selectedActionObject = ACTION_TYPES.find(({ type }) => type === selectedAction);

  const hasInvalidForm = (id?: string, action?: string) => {
    const validationState: ActionFormValidator = {};
    if (!id) {
      validationState.id = 'Action ID is required';
    }
    if (!action) {
      validationState.action = `${selectedActionObject?.label ?? 'Action'} is required`;
    }
    setInputsValidation(validationState);
    return !!Object.keys(validationState).length;
  };

  const handleCreate = async () => {
    try {
      const id = formRef.current.get('id')?.value?.trim() ?? '';
      const action = formRef.current.get('action')?.value?.trim() ?? '';
      const body = formRef.current.get('body')?.value?.trim() ?? '';
      const invalid = hasInvalidForm(id, action);
      const validHeaders = getValidHeaders();

      if (invalid) {
        return;
      }

      const payload = (() => {
        if (selectedAction === ActionType.Webhook) {
          return stringifyCustomWebhookPayload({
            url: action,
            method: selectedMethod,
            body,
            headers: validHeaders,
          });
        }
        return stringifyActionPayload(selectedAction, action);
      })();

      const success = await createNotificationMutationAsyncCall({
        id,
        type: selectedAction,
        action: payload,
        orgId,
      });

      if (success) {
        handleClose();

        enqueueSnackbar({ title: 'Notification action created', variant: 'success' });
      }
    } catch (error) {
      LogRocket.error(`Creating Notification failed`, error);
      enqueueSnackbar({ title: 'Notification creation failed', variant: 'error' });
    }
  };

  const handleDelete = async (confirmed: boolean) => {
    if (!confirmed) {
      setIsDeleteModelOpen(true);
      return;
    }
    const success = await deleteNotificationMutationAsyncCall({ id: actionDetails?.id ?? '', orgId });
    if (success) {
      navigateBack();
      enqueueSnackbar({ title: 'Notification action deleted', variant: 'success' });
    }

    setIsDeleteModelOpen(false);
  };

  const handleUpdate = async () => {
    try {
      const id = formRef.current.get('id')?.value?.trim() ?? '';
      const action = formRef.current.get('action')?.value?.trim() ?? '';
      const body = formRef.current.get('body')?.value?.trim() ?? '';
      const invalid = hasInvalidForm(id, action);
      const validHeaders = getValidHeaders();

      if (invalid) {
        return;
      }

      const payload = (() => {
        if (selectedAction === ActionType.Webhook) {
          return stringifyCustomWebhookPayload({
            url: action,
            method: selectedMethod,
            body,
            headers: validHeaders,
          });
        }
        return stringifyActionPayload(selectedAction, action);
      })();

      const success = await updateNotificationMutationAsyncCall({
        id,
        type: selectedAction,
        action: payload,
        orgId,
      });

      if (success) {
        handleClose();

        enqueueSnackbar({ title: 'Notification action updated', variant: 'success' });
      }
    } catch (error) {
      LogRocket.error(`Updating Notification failed`, error);
      enqueueSnackbar({ title: 'Notification update failed', variant: 'error' });
    }
  };

  const testAction = async (id: string, type: ActionType) => {
    try {
      const success = await testNotificationMutationAsyncCall({ orgId, id, type });

      const title = testNotificationMessagesMapper.get(type);

      if (success) {
        enqueueSnackbar({ title, variant: 'success' });
      }
    } catch (error) {
      LogRocket.error(`Error while attempting to test notification action ${id}`, error);
      enqueueSnackbar({ title: 'Notification test failed', variant: 'error' });
    }
  };

  const actionOption = ACTION_TYPES.find(({ type }) => type === actionDetails?.type);

  const handleTestMessage = () => {
    if (!notificationActionId || !actionOption) return;
    testAction(notificationActionId, actionOption.type);
  };

  const toggleAction = async (id: string, isEnabled: boolean) => {
    try {
      const mutationToCall = isEnabled ? disableNotificationMutationAsyncCall : enableNotificationMutationAsyncCall;

      await mutationToCall({ id, orgId });

      enqueueSnackbar({ title: `Notification action updated`, variant: 'success' });
      return true;
    } catch (error) {
      LogRocket.error(`Update notification status failed`, error);
      enqueueSnackbar({ title: `Notification update failed`, variant: 'error' });
      return false;
    }
  };

  const onSubmit = () => {
    if (editingAction) return handleUpdate();

    return handleCreate();
  };

  const onCancelDeletingModel = () => {
    setIsDeleteModelOpen(false);
  };

  function onSortDirectionChange(key: NotificationsOrderByEnum) {
    return (direction: SortDirectionType) => {
      setSort(key, direction);
    };
  }

  const getSortableHeaderProps = (key: NotificationsOrderByEnum, sortType: SortType) => {
    return {
      sortDirection: sortBy === key ? sortDirection : undefined,
      sortType,
      onSortDirectionChange: onSortDirectionChange(key),
    };
  };

  const navigateBack = () => {
    handleNavigation({ page: 'settings', settings: { path: 'notifications' } });
  };

  const mountActionUrl = (id: string) => {
    return getNavUrl({ page: 'settings', settings: { path: 'notifications', id } });
  };

  return {
    actionDetails,
    actionNotFound,
    defaultWebhookFields,
    editingAction,
    editingActionId,
    fetchingErrorMessage: FETCHING_ERROR_MESSAGE,
    formRef,
    getActionDetailsLabel,
    getActionDisplayName,
    getSortableHeaderProps,
    handleClose,
    handleDelete,
    handleEdit,
    handleNewActionClick,
    handleTestMessage,
    hasData,
    headers,
    headersHandlers,
    inputsValidation,
    isCreatingNotification: isCreatingNotification || isUpdatingNotification,
    isDeleteModelOpen,
    isLoading,
    isResourcesLoading,
    listingNotificationsError,
    mountActionUrl,
    navigateBack,
    notifications: notificationsList,
    onCancelDeletingModel,
    onSubmit,
    relatedMonitors,
    searchText,
    selectedAction,
    selectedActionObject,
    selectedMethod,
    setInputsValidation,
    setSearchText,
    setSelectedAction,
    setSelectedMethod,
    tableRowsCount,
    toggleAction,
    orgId,
    sortBy,
    sortDirection,
  };
};
