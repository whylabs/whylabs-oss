import {
  GetCustomDashboardsByUsedOnMetadataQuery,
  useGetCustomDashboardsByUsedOnMetadataQuery,
} from 'generated/graphql';
import { MainStackEvents } from 'hooks/useStackCustomEventListeners';
import { useCallback, useEffect } from 'react';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

export const LOADING_CUSTOM_DASHBOARDS_TAB_LABEL = 'Loading...';
const MAX_RESOURCE_CUSTOM_DASHBOARDS = 12;

type HookProps = {
  onDeleteCallback: () => void;
  resourceId: string;
  selectedDashboardId?: string;
};

type UsedOnString = `resource|${string}`;

type DashboardsType = NonNullable<GetCustomDashboardsByUsedOnMetadataQuery['customDashboards']>;

type HookOutput = {
  activeDashboardLabel: string | null;
  dashboardsIds: string[];
  dashboards: DashboardsType;
  disableAddButtonMessage: string | null;
  loading: boolean;
  usedOn: UsedOnString;
};

export const useResourceCustomDashboard = ({
  onDeleteCallback,
  resourceId,
  selectedDashboardId,
}: HookProps): HookOutput => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const usedOn: UsedOnString = `resource|${resourceId}`;
  const { data, loading, refetch } = useGetCustomDashboardsByUsedOnMetadataQuery({
    variables: { usedOn },
  });

  const dashboardDeletionEventHandler = useCallback(() => {
    enqueueSnackbar({ title: 'Dashboard deleted' });

    refetch({ usedOn });

    onDeleteCallback();
  }, [enqueueSnackbar, onDeleteCallback, refetch, usedOn]);

  const dashboardNameChangeEventHandler = useCallback(() => {
    refetch({ usedOn });
  }, [refetch, usedOn]);

  useEffect(() => {
    window.document.addEventListener(MainStackEvents.DashboardDeletion, dashboardDeletionEventHandler);
    return () => {
      window.document.removeEventListener(MainStackEvents.DashboardDeletion, dashboardDeletionEventHandler);
    };
  }, [dashboardDeletionEventHandler]);

  useEffect(() => {
    window.document.addEventListener(MainStackEvents.DashboardNameChange, dashboardNameChangeEventHandler);
    return () => {
      window.document.removeEventListener(MainStackEvents.DashboardNameChange, dashboardNameChangeEventHandler);
    };
  }, [dashboardNameChangeEventHandler]);

  const dashboardsIds = data?.customDashboards?.map((d) => d.id) || [];

  const activeDashboardLabel = ((): string | null => {
    // Tab name isn't ready yet, so we'll return the loading tab label
    if (loading) return LOADING_CUSTOM_DASHBOARDS_TAB_LABEL;
    if (!selectedDashboardId) return null;

    const selectedDashboard = data?.customDashboards?.find((d) => d.id === selectedDashboardId);
    return selectedDashboard?.displayName ?? null;
  })();

  const disableAddButtonMessage = (() => {
    if (dashboardsIds.length >= MAX_RESOURCE_CUSTOM_DASHBOARDS) {
      return `You have reached the maximum number of custom dashboards (${MAX_RESOURCE_CUSTOM_DASHBOARDS}) for this resource.`;
    }
    return null;
  })();

  return {
    activeDashboardLabel,
    dashboardsIds,
    dashboards: data?.customDashboards ?? [],
    disableAddButtonMessage,
    loading,
    usedOn,
  };
};
