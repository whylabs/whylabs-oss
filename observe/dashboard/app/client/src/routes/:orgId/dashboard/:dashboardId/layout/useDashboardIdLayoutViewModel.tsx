import { useExtraRangePresets } from '~/components/super-date-picker/hooks/useExtraRangePresets';
import { CUSTOM_RANGE } from '~/components/super-date-picker/utils';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import {
  RELATIVE_PRESET_TOKEN,
  mapTimePeriodToPresetGranularity,
  useDynamicTrailingRangePresets,
} from '~/hooks/useDynamicTrailingRangePresets';
import { useIsDemoOrg } from '~/hooks/useIsDemoOrg';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useCheckMembershipRole } from '~/hooks/useIsViewerOnly';
import { useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { DrawerState } from '~/routes/:orgId/dashboard/:dashboardId/utils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { generateFriendlyName } from '~/utils/friendlyNames';
import { getOldStackResourcePageUrl } from '~/utils/oldStackUtils';
import { SELECTED_ORG_QUERY_NAME, WIDGET_INDEX_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { isValidNumber } from '~/utils/typeGuards';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { CustomDashboardUpsertInputType } from '~server/trpc/dashboard/custom';
import {
  CustomDashboardSchema,
  CustomDashboardWidgets,
  DashboardDateRangeType,
} from '~server/trpc/dashboard/types/dashboards';
import { isEqual } from 'lodash';
import LogRocket from 'logrocket';
import { useRef, useState } from 'react';
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router-dom';

import { DashboardWidgetObject } from '../../components/custom-dashboard/types';
import {
  convertChartBuilderPlotsToPieQuery,
  convertChartBuilderPlotsToTimeseriesQuery,
  convertCustomDashboardToChartBuilderObject,
} from '../../components/custom-dashboard/utils';
import { useDashboardMutationRangePreset } from './hooks/useDashboardMutationRangePreset';
import { DashboardIdLayoutLoaderData } from './useDashboardIdLayoutLoader';

export function useDashboardIdLayoutViewModel() {
  const { dashboard, orgId, dashboardId, usedOn } = useLoaderData() as DashboardIdLayoutLoaderData;
  const revalidator = useRevalidator();
  const { isEmbeddedIntoCustomContext } = useIsEmbedded();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const membershipRole = useCheckMembershipRole();
  const isDemoOrg = useIsDemoOrg();
  const { handleNavigation, replaceBrowserLocation } = useNavLinkHandler();
  const { backToMainStackURL } = useWhyLabsSearchParams();
  const { presets: extraPresets } = useExtraRangePresets();
  const { presetOptions: hourlyPresets } = useDynamicTrailingRangePresets(TimePeriod.Pt1H);
  const { presetOptions: dailyPresets } = useDynamicTrailingRangePresets(TimePeriod.P1D);
  const mainStackEventEmitter = useMainStackCustomEventsEmitters();

  const dashboardsPickerPresets = (() => {
    return hourlyPresets.concat(dailyPresets).concat(extraPresets.custom);
  })();

  const {
    appliedPreset,
    applyTrailingWindowRange,
    endTimestamp,
    rawDateRange,
    getRangeConfig,
    setDatePickerRange,
    startTimestamp,
  } = useDashboardMutationRangePreset();
  const firstLoad = useRef(true);
  const [searchParams] = useSearchParams();
  const upsertMutation = trpc.dashboard.custom.upsert.useMutation();
  const deleteDashboardMutation = trpc.dashboard.custom.delete.useMutation();
  const { isSaving } = useMutationProperties({ mutation: upsertMutation, revalidator });
  const { isSaving: isDeleting } = useMutationProperties({ mutation: deleteDashboardMutation, revalidator });

  useDeepCompareEffect(() => {
    const { dateRange } = dashboard?.schema ?? {};
    if (!dateRange || !firstLoad.current) return;
    if (dateRange.type === DashboardDateRangeType.fixed) {
      setDatePickerRange(
        { from: new Date(dateRange.startDate).getTime(), to: new Date(dateRange.endDate).getTime() },
        CUSTOM_RANGE,
      );
    }
    if (dateRange.type === DashboardDateRangeType.relative) {
      applyTrailingWindowRange(dateRange.size, dateRange.timePeriod);
    }
    firstLoad.current = false;
  }, [applyTrailingWindowRange, dashboard?.schema, setDatePickerRange]);

  const isEditing = !!dashboard;
  const initialDisplayNameRef = useRef(isEditing ? dashboard.displayName : generateFriendlyName().concat('-dashboard'));

  const [displayName, setDisplayName] = useState(initialDisplayNameRef.current);
  const initialWidgets = isEditing ? convertCustomDashboardToChartBuilderObject(dashboard?.schema?.charts ?? []) : [];
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetObject[]>(initialWidgets);
  const [dashboardPersistedRange, setDashboardPersistedRange] = useState<
    CustomDashboardSchema['dateRange'] | undefined
  >(dashboard?.schema?.dateRange);

  const [widgetSelectorDrawer, setWidgetSelectorDrawer] = useState<DrawerState>({
    open: !dashboardWidgets.length && dashboardId === AppRoutePaths.create,
    widgetIndex: 0,
  });

  const changeGraphPosition = (graphIndex: number, direction: 'up' | 'down') => {
    setDashboardWidgets((graphs) => {
      const targetGraph = graphs[graphIndex];
      const newIndex = direction === 'up' ? graphIndex - 1 : graphIndex + 1;
      const newDashboardsOrder = graphs.filter((_, index) => index !== graphIndex);
      newDashboardsOrder.splice(newIndex, 0, targetGraph);
      saveDashboard(newDashboardsOrder);
      return newDashboardsOrder;
    });
  };

  const hasUnsavedDateRange = () => {
    if (!dashboardPersistedRange) return true;
    if (dashboardPersistedRange?.type === DashboardDateRangeType.fixed) {
      const { startDate, endDate } = dashboardPersistedRange;
      const savedStartTimestamp = new Date(startDate).getTime();
      const savedEndTimestamp = new Date(endDate).getTime();
      if (
        savedStartTimestamp !== rawDateRange.startTimestamp ||
        savedEndTimestamp !== rawDateRange.endTimestamp ||
        appliedPreset !== CUSTOM_RANGE
      ) {
        return true;
      }
    }
    if (dashboardPersistedRange?.type === DashboardDateRangeType.relative) {
      const { size } = dashboardPersistedRange;
      const presetGranularityToken =
        mapTimePeriodToPresetGranularity.get(dashboardPersistedRange.timePeriod) ?? 'daily';
      if (appliedPreset !== `${presetGranularityToken}${RELATIVE_PRESET_TOKEN}${size}`) {
        return true;
      }
    }
    return false;
  };

  const hasUnsavedChanges = (() => {
    if (!isEditing) return true;

    if (dashboard.displayName !== displayName) return true;

    if (!isEqual(initialWidgets, dashboardWidgets)) return true;

    return hasUnsavedDateRange();
  })();

  const displayNameOnChangeHandler = (value: string) => {
    setDisplayName(value);
  };

  const saveDashboardDisplayName = (value: string) => {
    setDisplayName(value);

    if (isEditing) {
      // Auto update the dashboard on every name change
      saveDashboard(dashboardWidgets);
    }
  };

  const onUpdateWidget = (widget: DashboardWidgetObject, autoSaveDashboard: boolean) => {
    setDashboardWidgets((current) => {
      const newState = current.map((c) => {
        if (c.id === widget.id) return widget;

        return c;
      });

      if (autoSaveDashboard) {
        saveDashboard(newState);
      }
      return newState;
    });
    if (autoSaveDashboard) {
      enqueueSnackbar({ title: 'Widget updated' });
    }
  };

  const onSaveWidget = (widget: DashboardWidgetObject, autoSaveDashboard = true) => {
    if (widget.id === AppRoutePaths.newWidget) {
      setDashboardWidgets((current) => {
        const newWidgetIndexParam = searchParams.get(WIDGET_INDEX_QUERY_NAME);
        const widgetIndex = isValidNumber(Number(newWidgetIndexParam)) ? Number(newWidgetIndexParam) : 0;
        const newState = [...current];
        newState.splice(widgetIndex, 0, {
          ...widget,
          id: `${generateFriendlyName()}-${widget.type}`,
        });
        if (autoSaveDashboard) {
          saveDashboard(newState);
        }
        return newState;
      });
      setWidgetSelectorDrawer({ open: false, widgetIndex: 0 });

      enqueueSnackbar({ title: 'Widget saved' });
    } else {
      onUpdateWidget(widget, autoSaveDashboard);
    }
  };

  const onCloneWidget = (widget: DashboardWidgetObject, index: number) => {
    return () => {
      if (!dashboard) return;

      const newWidgetId = `${generateFriendlyName()}-${widget.type}`;
      const newWidget = { ...widget, displayName: `${widget.displayName} (copy)`, id: newWidgetId };

      setDashboardWidgets((current) => {
        const newState = [...current];
        newState.splice(index, 0, newWidget);
        saveDashboard(newState);
        return newState;
      });

      enqueueSnackbar({ title: 'Widget cloned' });
      handleNavigation({ page: 'dashboards', dashboards: { dashboardId: dashboard.id, graphId: newWidgetId } });
    };
  };

  const onDeleteWidget = (id: string) => {
    setDashboardWidgets((current) => {
      const newState = current.filter((c) => c.id !== id);
      saveDashboard(newState);
      return newState;
    });

    enqueueSnackbar({ title: 'Widget deleted' });
  };

  const getWidgetById = (id: string) => {
    return dashboardWidgets.find((chart) => chart.id === id);
  };

  const saveDashboard = async (withWidgets: DashboardWidgetObject[], retry = 0) => {
    if (!membershipRole || membershipRole?.isViewer || isDemoOrg !== false) return;
    const widgets: CustomDashboardWidgets[] = [];

    withWidgets.forEach((widget) => {
      if (widget.type === 'pie') {
        const { plots, ...rest } = widget;
        widgets.push({
          ...rest,
          pie: convertChartBuilderPlotsToPieQuery(plots),
          type: 'pie',
        });
      }
      if (widget.type === 'timeseries') {
        const { plots, ...rest } = widget;
        widgets.push({
          ...rest,
          timeseries: convertChartBuilderPlotsToTimeseriesQuery(plots),
          type: 'timeseries',
        });
      }
      if (widget.type === 'dataComparison' || widget.type === 'metricComparison') {
        widgets.push({
          ...widget,
        });
      }
    });

    const dateRange = getRangeConfig();

    const metadata: CustomDashboardSchema['metadata'] = (() => {
      // We don't have plans to allow editing metadata for now
      if (isEditing && dashboard.schema) return dashboard.schema.metadata;

      if (usedOn?.raw) return { usedOn: usedOn.raw };

      return undefined;
    })();

    const schema: CustomDashboardUpsertInputType['schema'] = {
      id: `${generateFriendlyName()}-schema`,
      ...(dashboard?.schema ?? {}),
      metadata,
      dateRange,
      charts: widgets,
    };

    const payload: CustomDashboardUpsertInputType = {
      id: isEditing ? dashboard.id : undefined,
      orgId,
      displayName,
      schema,
    };
    try {
      const newDashboard = await upsertMutation.mutateAsync(payload);
      setDashboardPersistedRange(dateRange);
      // If mutation succeeded
      if (newDashboard) {
        // If it's a new dashboard for a resource context, force navigate it back
        if (!isEditing && usedOn?.meta === 'resource' && usedOn.resourceId) {
          const backToUrl = new URL(backToMainStackURL ?? '');
          const backToSearchParams = backToUrl.searchParams;
          // make sure it has the targetOrgId
          backToSearchParams.set(SELECTED_ORG_QUERY_NAME, orgId);

          const newUrl = getOldStackResourcePageUrl({
            resourceId: usedOn.resourceId,
            additionalPath: `/${newDashboard.id}?${backToSearchParams.toString()}`,
            orgId,
          });

          replaceBrowserLocation(newUrl);
          return;
        }
        revalidator.revalidate();

        const wasDisplayNameUpdated = newDashboard.displayName !== initialDisplayNameRef.current;
        if (wasDisplayNameUpdated) {
          if (isEmbeddedIntoCustomContext) {
            // If it's embedded into a custom context and the display name was updated, emit the event
            mainStackEventEmitter.dashboardNameChange(dashboardId, newDashboard.displayName);
          }

          initialDisplayNameRef.current = displayName;
        }

        if (isEditing) {
          enqueueSnackbar({ title: 'Dashboard updated' });
        } else {
          enqueueSnackbar({ title: 'Dashboard saved' });
          // If it's a new dashboard, navigate to it's page
          handleNavigation({ page: 'dashboards', dashboards: { dashboardId: newDashboard.id } });
        }
      }
    } catch (e) {
      // If it failed to save, retry up to 3 times
      if (retry < 3) {
        setTimeout(() => saveDashboard(withWidgets, retry + 1), 1000);
      } else {
        enqueueSnackbar({ title: 'Failed to save dashboard. Try again later', variant: 'error' });
        LogRocket.error(e, 'Failed to save dashboard after 3 retries', payload);
      }
    }
  };

  const onSaveDashboard = () => {
    saveDashboard(dashboardWidgets);
  };

  const deleteDashboard = async () => {
    if (deleteDashboardMutation.isLoading) return;
    await deleteDashboardMutation.mutateAsync({ orgId, id: dashboardId });

    if (isEmbeddedIntoCustomContext) {
      mainStackEventEmitter.dashboardDeletion(dashboardId);
    } else {
      enqueueSnackbar({ title: 'Dashboard deleted' });
    }
  };

  return {
    dashboardWidgets,
    displayName,
    displayNameOnChangeHandler,
    getWidgetById,
    hasUnsavedChanges,
    changeGraphPosition,
    deleteDashboard,
    isDeleting,
    isEmbeddedIntoCustomContext,
    isSaving,
    onCloneWidget,
    onDeleteWidget,
    onSaveWidget,
    onSaveDashboard,
    membershipRole,
    isDemoOrg,
    dashboardId,
    saveDashboardDisplayName,
    dashboardsPickerPresets,
    dashboardPersistedRange,
    getRangeConfig,
    usedOn,
    createWidgetDrawerState: {
      value: widgetSelectorDrawer,
      setter: setWidgetSelectorDrawer,
    },
  };
}
