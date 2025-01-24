import { WhyLabsButton, WhyLabsSelect } from '~/components/design-system';
import { useReferenceProfile } from '~/hooks/resources/useReferenceProfile';
import { useResourceColumnsSelectorData } from '~/hooks/selector-data/useResourceColumnsSelectorData';
import { useResourceProfileMetricsSelectorData } from '~/hooks/selector-data/useResourceProfileMetricsSelectorData';
import { useResourcesSelectorData } from '~/hooks/selector-data/useResourcesSelectorData';
import { useOrgId } from '~/hooks/useOrgId';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import {
  DashboardDataEvaluationTypes,
  DataEvaluationBuilderObject,
} from '~/routes/:orgId/dashboard/components/custom-dashboard/types';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { generateFriendlyName } from '~/utils/friendlyNames';
import { trpc } from '~/utils/trpc';
import { AnalysisTargetLevel, TimePeriod } from '~server/graphql/generated/graphql';
import { CustomDashboardDateRange } from '~server/trpc/dashboard/types/dashboards';
import {
  DATASET_METRIC_COLUMN_VALUE,
  DataEvaluationParameters,
  EvaluationAggregationType,
  EvaluationColumnDefinitionType,
  OVERALL_SEGMENT_KEY_VALUE,
} from '~server/trpc/dashboard/types/data-evalutation-types';
import { UsedOnMetadata } from '~server/trpc/dashboard/util/dashboardUtils';
import { mapStringToTimePeriod } from '~server/util/time-period-utils';
import { isEqual } from 'lodash';
import LogRocket from 'logrocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEvaluationCommonStyles } from './components/utils';
import {
  SuperDatePickerState,
  TABLE_COLUMN_GROUP_BY_LIMIT,
  TempWidgetParams,
  getRefProfileColumnDefinition,
  getSegmentColumnDefinition,
  getTrailingWindowRange,
  handleEvaluationQueryParams,
  handleEvaluationRangeTruncation,
  translateRangeToWidgetFormat,
  translateWidgetRangeToState,
} from './utils';

export type DataEvaluationBuilderChild = {
  parentViewModel: ReturnType<typeof useDataEvaluationBuilderViewModel>;
};

type ValidatedFieldControls = 'resourceId' | 'metrics' | 'resourceColumns' | 'dateRange' | 'referenceProfiles';
export type DataEvaluationBuilderViewModelProps = {
  onClose?: () => void;
  onSave: (chart: DataEvaluationBuilderObject, autoSaveDashboard?: boolean) => void;
  widgetType: DashboardDataEvaluationTypes;
  initialWidgetObject?: DataEvaluationBuilderObject;
  isEditWidgetPage?: boolean;
  usedOn: UsedOnMetadata | null;
};
export const useDataEvaluationBuilderViewModel = ({
  onSave,
  onClose,
  widgetType,
  initialWidgetObject,
  isEditWidgetPage = true,
  usedOn,
}: DataEvaluationBuilderViewModelProps) => {
  const { classes, cx } = useEvaluationCommonStyles();
  const initialDisplayName = useRef(initialWidgetObject?.displayName ?? generateFriendlyName().concat('-comparison'));
  const [displaySideControls, setDisplaySideControls] = useState<boolean>(isEditWidgetPage);
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  const isDirty = useRef(false);
  const orgId = useOrgId();
  const {
    resourcesList,
    data: resources,
    isLoading: isLoadingResources,
  } = useResourcesSelectorData({ displayLabelAs: 'id' });
  const [queryParamsState, setQueryParamsState] = useState<DataEvaluationParameters | undefined>(
    initialWidgetObject?.params ?? undefined,
  );
  const persistedResourceBatchFrequency = (() => {
    const persistedTimePeriod = resources?.find(
      ({ id }) => !!queryParamsState?.resourceId && queryParamsState.resourceId === id,
    )?.timePeriod;
    return isLoadingResources ? null : mapStringToTimePeriod.get(persistedTimePeriod ?? '') ?? TimePeriod.P1D;
  })();

  const usedQueryParams = useMemo(
    () =>
      !persistedResourceBatchFrequency
        ? undefined
        : handleEvaluationQueryParams(queryParamsState, persistedResourceBatchFrequency),
    [persistedResourceBatchFrequency, queryParamsState],
  );
  const [displayColumnManagementModal, setDisplayColumnManagementModal] = useState<
    'tempParams' | 'persistedParams' | null
  >(null);

  const [tempControlsState, setTempControlsState] = useState<TempWidgetParams>(
    initialWidgetObject?.params ?? {
      // If it is embedded into a resource, we want to set its id as default
      resourceId: usedOn?.resourceId ?? undefined,
      type: EvaluationAggregationType.DateRange,
      tableColumnsDefinition: { type: EvaluationColumnDefinitionType.Segment },
    },
  );

  const [dateRangeState, setDateRangeState] = useState<SuperDatePickerState>(
    initialWidgetObject?.params?.type === EvaluationAggregationType.DateRange
      ? translateWidgetRangeToState(initialWidgetObject.params.dateRange) ?? getTrailingWindowRange()
      : getTrailingWindowRange(),
  );
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const [invalidControls, setInvalidControls] = useState<Set<ValidatedFieldControls>>(new Set());

  const clearInvalidFieldState = (field: ValidatedFieldControls[]) =>
    setInvalidControls((prev) => {
      const newValue = new Set(prev);
      field.forEach((f) => newValue.delete(f));
      return newValue;
    });

  const resourceColumnsList = useResourceColumnsSelectorData({
    resourceId: tempControlsState.resourceId ?? null,
    filter: { dataType: ['integral', 'fractional'], discreteOnly: false },
  });

  const {
    data: profileMetricsData,
    metricsSelectData,
    isLoading: isLoadingProfileMetrics,
  } = useResourceProfileMetricsSelectorData({
    resourceId: tempControlsState.resourceId ?? '',
    skipMonitorMetrics: true,
    skipLlmSecureMetrics: true,
  });

  const fetchResourceSegmentKeysEnabled = !!tempControlsState.resourceId;
  const resourceSegmentKeys = trpc.meta.segments.listKeys.useQuery(
    {
      orgId,
      resourceId: tempControlsState.resourceId ?? '',
      tags: [],
    },
    { enabled: fetchResourceSegmentKeysEnabled },
  );
  const isLoadingSegmentKeys = resourceSegmentKeys.isLoading && fetchResourceSegmentKeysEnabled;

  const tempRefProfileColumnDefinition = getRefProfileColumnDefinition(tempControlsState);
  const tempSegmentColumnDefinition = getSegmentColumnDefinition(tempControlsState);

  const columnGroupIsOverallSegment = tempSegmentColumnDefinition?.groupBySegmentKey === OVERALL_SEGMENT_KEY_VALUE;
  const fetchColumnGroupSegmentValuesEnabled = !!(
    tempSegmentColumnDefinition?.groupBySegmentKey &&
    !columnGroupIsOverallSegment &&
    tempControlsState?.resourceId
  );
  const columnGroupSegmentValues = trpc.meta.segments.listValueForKey.useQuery(
    {
      orgId,
      resourceId: tempControlsState?.resourceId ?? '',
      key: tempSegmentColumnDefinition?.groupBySegmentKey ?? '',
      tags: [],
    },
    { enabled: fetchColumnGroupSegmentValuesEnabled },
  );

  const isLoadingColumnGroupSegmentValues = columnGroupSegmentValues.isLoading && fetchColumnGroupSegmentValuesEnabled;

  const fetchReferenceProfilesIsEnabled = tempRefProfileColumnDefinition && tempControlsState.resourceId;
  const { data: refProfilesData, isLoading: loadingRefProfiles } = useReferenceProfile({
    orgId,
    resourceId: fetchReferenceProfilesIsEnabled ? tempControlsState.resourceId ?? '' : '',
  });
  const isLoadingReferenceProfiles = !!(fetchReferenceProfilesIsEnabled && loadingRefProfiles);

  /*
   * Whenever the table column definition has the value options loaded and there's nothing selected
   * we programmatically set up to 5 first available values on the **temp** state.
   * */
  const hasNoColumnsSelected =
    !tempSegmentColumnDefinition?.segmentValues?.length && !tempRefProfileColumnDefinition?.referenceProfileIds?.length;
  const isLoadingTableColumnOptions = isLoadingColumnGroupSegmentValues || isLoadingReferenceProfiles;
  const hasSegmentColumnOptions =
    tempSegmentColumnDefinition && columnGroupSegmentValues?.data?.length && !columnGroupIsOverallSegment;
  const hasRefProfileColumnOptions = tempRefProfileColumnDefinition && refProfilesData?.length;

  if (hasNoColumnsSelected && !isLoadingTableColumnOptions && (hasSegmentColumnOptions || hasRefProfileColumnOptions)) {
    // Programmatically set up to 5 columns by default if we have no table columns definition
    setTempControlsState((prev) => {
      if (!prev) return prev;
      const { tableColumnsDefinition } = prev;
      if (
        prev.type === EvaluationAggregationType.DateRange &&
        tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment
      ) {
        return {
          ...prev,
          tableColumnsDefinition: {
            ...tableColumnsDefinition,
            segmentValues: columnGroupSegmentValues?.data?.slice(0, TABLE_COLUMN_GROUP_BY_LIMIT),
          },
        };
      }
      if (
        prev.type === EvaluationAggregationType.ReferenceProfile &&
        tableColumnsDefinition?.type === EvaluationColumnDefinitionType.ReferenceProfile
      ) {
        return {
          ...prev,
          tableColumnsDefinition: {
            ...tableColumnsDefinition,
            referenceProfileIds: refProfilesData.slice(0, TABLE_COLUMN_GROUP_BY_LIMIT).map(({ value }) => value) ?? [],
          },
        };
      }
      return prev;
    });
  }

  const segmentKeysSelectorData = (() => {
    if (isLoadingSegmentKeys || !fetchResourceSegmentKeysEnabled) return [];
    return [{ label: 'All data', value: OVERALL_SEGMENT_KEY_VALUE }].concat(
      (resourceSegmentKeys?.data ?? []).map((key) => ({ label: key, value: key })),
    );
  })();

  const loadingSideControlsData =
    isLoadingResources ||
    resourceColumnsList.isLoading ||
    isLoadingSegmentKeys ||
    isLoadingProfileMetrics ||
    isLoadingReferenceProfiles;

  const [displayName, setDisplayName] = useState(initialDisplayName.current);

  const onChangeDisplayName = (newDisplayName: string) => {
    isDirty.current = true;
    setDisplayName(newDisplayName);
  };

  const onChangeDataSource = (selectedColumns: string[], selectedMetrics: string[]) => {
    const newMetrics = findMetricsByValue(selectedMetrics);
    if (!newMetrics?.length && !selectedColumns?.length) return;
    clearInvalidFieldState(['metrics']);
    setTempControlsState((prev) => {
      const prevMetrics = prev?.dataSource?.metrics ?? [];
      const prevColumns = prev?.dataSource?.resourceColumns ?? [];
      const newState = {
        ...prev,
        dataSource: {
          metrics: prevMetrics.concat(newMetrics),
          resourceColumns: prevColumns.concat(selectedColumns),
        },
      };
      if (!isEqual(newState, prev)) {
        // this may run twice because of React strict mode, but in prod it would be just once.
        // https://github.com/facebook/react/issues/12856
        onApplyParamsChanges({ skipValidationFeedback: false, tempParams: newState });
      }
      return newState;
    });
  };

  const onChangeResourceColumns = (newValue: string[]) => {
    if (newValue?.length) clearInvalidFieldState(['resourceColumns']);
    setTempControlsState((prev) => ({
      ...prev,
      dataSource: {
        metrics: [],
        ...prev.dataSource,
        resourceColumns: newValue,
      },
    }));
  };

  const findMetricsByValue = (metricValues: string[]) =>
    profileMetricsData?.flatMap((m) => {
      if (!metricValues.includes(m.value) || m.source === 'Monitors' || !m.queryDefinition?.metric) return [];
      const { metric, column, targetLevel } = m.queryDefinition ?? {};
      if (targetLevel === AnalysisTargetLevel.Dataset) {
        return [{ metric, column: DATASET_METRIC_COLUMN_VALUE }];
      }
      return [{ metric, column: column || undefined }];
    }) ?? [];

  const onChangeMetrics = (newValue: string[]) => {
    if (newValue?.length) {
      clearInvalidFieldState(['metrics', 'resourceColumns']);
    }
    const newMetrics = findMetricsByValue(newValue);

    setTempControlsState((prev) => {
      return {
        ...prev,
        dataSource: { metrics: newMetrics, resourceColumns: prev.dataSource?.resourceColumns ?? [] },
      };
    });
  };

  const onChangeColumnDefinitionSegmentValues = (newValue: string[]) => {
    const createNewState = <T extends TempWidgetParams>(prev: T): T => {
      if (!prev) return prev;
      const { tableColumnsDefinition } = prev;
      if (
        prev.type === EvaluationAggregationType.ReferenceProfile ||
        tableColumnsDefinition?.type !== EvaluationColumnDefinitionType.Segment ||
        !tableColumnsDefinition?.groupBySegmentKey
      ) {
        return prev;
      }
      return {
        ...prev,
        tableColumnsDefinition: {
          ...tableColumnsDefinition,
          type: EvaluationColumnDefinitionType.Segment,
          segmentValues: newValue.slice(0, TABLE_COLUMN_GROUP_BY_LIMIT),
        },
      };
    };
    if (displayColumnManagementModal === 'persistedParams') {
      setQueryParamsState((prev) => {
        if (!prev) return prev;
        return createNewState(prev ?? {});
      });
    }
    // changing persisted queries also changes the temp params to keep UX consistent
    setTempControlsState((prev) => {
      if (!prev) return prev;
      return createNewState(prev ?? {});
    });
  };

  const onChangeColumnDefinitionRefProfileValues = (newValue: string[]) => {
    const createNewState = <T extends TempWidgetParams>(prev: T): T => {
      if (!prev) return prev;
      const { tableColumnsDefinition } = prev;
      if (
        prev.type === EvaluationAggregationType.DateRange ||
        tableColumnsDefinition?.type !== EvaluationColumnDefinitionType.ReferenceProfile
      ) {
        return prev;
      }
      return {
        ...prev,
        tableColumnsDefinition: {
          ...tableColumnsDefinition,
          type: EvaluationColumnDefinitionType.ReferenceProfile,
          referenceProfileIds: newValue.slice(0, TABLE_COLUMN_GROUP_BY_LIMIT),
        },
      };
    };
    if (displayColumnManagementModal === 'persistedParams') {
      setQueryParamsState((prev) => {
        if (!prev) return prev;
        return createNewState(prev ?? {});
      });
    }
    // changing persisted queries also changes the temp params to keep UX consistent
    setTempControlsState((prev) => {
      if (!prev) return prev;
      return createNewState(prev ?? {});
    });
  };

  const onChangeRowSegmentGrouping = (newSegmentGroup: string) => {
    setTempControlsState((prev) => ({
      ...prev,
      tableRowsDefinition: { rowSegmentGroup: [newSegmentGroup], inclusionMode: ['individual'] },
    }));
  };

  const onChangeAggregationType = (newValue: EvaluationAggregationType) => {
    const isReferenceType = newValue === EvaluationAggregationType.ReferenceProfile;
    setTempControlsState((prev) => {
      const preservedParams = {
        resourceId: prev.resourceId,
        tableRowsDefinition: prev.tableRowsDefinition,
        dataSource: prev.dataSource,
      };
      if (isReferenceType) {
        return {
          type: EvaluationAggregationType.ReferenceProfile,
          tableColumnsDefinition: { type: EvaluationColumnDefinitionType.ReferenceProfile, referenceProfileIds: [] },
          ...preservedParams,
        };
      }
      return {
        type: EvaluationAggregationType.DateRange,
        tableColumnsDefinition: { type: EvaluationColumnDefinitionType.Segment },
        ...preservedParams,
      };
    });
  };

  const isValidQueryParams = (
    params: TempWidgetParams,
    currentDateRange?: CustomDashboardDateRange,
    skipValidationFeedback = false,
  ): params is DataEvaluationBuilderObject['params'] => {
    const { resourceColumns, metrics } = params.dataSource ?? {};
    const invalidFields: Set<ValidatedFieldControls> = new Set();
    if (!params.resourceId) invalidFields.add('resourceId');
    if (params.type === EvaluationAggregationType.DateRange && !currentDateRange) {
      invalidFields.add('dateRange');
    }
    if (
      params.type === EvaluationAggregationType.ReferenceProfile &&
      (params.tableColumnsDefinition?.type !== EvaluationColumnDefinitionType.ReferenceProfile ||
        !params.tableColumnsDefinition.referenceProfileIds?.length)
    ) {
      invalidFields.add('referenceProfiles');
    }
    const hasDatasetMetrics = !!metrics?.filter((m) => !!m.column)?.length;
    if (!hasDatasetMetrics && !resourceColumns?.length) invalidFields.add('resourceColumns');
    if (!metrics?.length) invalidFields.add('metrics');
    if (!skipValidationFeedback) {
      setInvalidControls(invalidFields);
    }
    return !invalidFields.size;
  };

  const [tempSelectedResource, tempSelectedDateRange, dataControlsPickerTimePeriod] = useMemo(() => {
    const selectedResource = resources?.find(
      ({ id }) => !!tempControlsState.resourceId && tempControlsState.resourceId === id,
    );
    const fallbackTimePeriod = mapStringToTimePeriod.get(selectedResource?.timePeriod ?? 'unknown') ?? TimePeriod.Pt1H;
    const newDateRange = translateRangeToWidgetFormat(dateRangeState, fallbackTimePeriod);
    if (!newDateRange) {
      // this is not likely to be undefined for this case because we have fallbacks for dates, if we get here it may have a bug on the code
      LogRocket.error(
        `Failed to parse data evaluation dateRange: getDashboardRangeConfig : ${JSON.stringify(dateRangeState)}`,
      );
    }
    return [selectedResource, newDateRange, fallbackTimePeriod];
  }, [dateRangeState, resources, tempControlsState.resourceId]);

  useEffect(() => {
    setDateRangeState((prev) => {
      return handleEvaluationRangeTruncation(prev, dataControlsPickerTimePeriod);
    });
  }, [dataControlsPickerTimePeriod]);

  const onApplyParamsChanges = useCallback(
    ({
      skipValidationFeedback,
      tempParams = tempControlsState,
    }: { skipValidationFeedback?: boolean; tempParams?: TempWidgetParams } = {}) => {
      const validParams = isValidQueryParams(tempParams, tempSelectedDateRange, skipValidationFeedback);
      const validSelectedRange =
        tempParams.type === EvaluationAggregationType.DateRange ? !!tempSelectedDateRange : true;
      if (tempSelectedResource && validSelectedRange && validParams) {
        const persistDateRange = tempParams.type === EvaluationAggregationType.DateRange && tempSelectedDateRange;
        setQueryParamsState({
          ...structuredClone(tempParams),
          ...(persistDateRange ? { dateRange: tempSelectedDateRange } : {}),
        });
        if (isEditWidgetPage) {
          enqueueSnackbar({ title: 'Changes applied' });
        }
      } else if (!skipValidationFeedback) {
        enqueueSnackbar({
          title: 'Invalid parameters selected. Review the data controls and try again',
          variant: 'warning',
        });
      }
    },
    [enqueueSnackbar, isEditWidgetPage, tempControlsState, tempSelectedDateRange, tempSelectedResource],
  );

  const handleMetricDeletion = useCallback(
    (
      removedColumn?: string | null,
      removedMetric?: DataEvaluationParameters['dataSource']['metrics'][number] | null,
    ) => {
      setTempControlsState((prev) => {
        const prevMetrics = prev?.dataSource?.metrics ?? [];
        const prevColumns = prev?.dataSource?.resourceColumns ?? [];
        const newState = {
          ...prev,
          dataSource: {
            metrics: prevMetrics.filter((m) => {
              const isSameMetric = m.metric?.toLowerCase() === removedMetric?.metric?.toLowerCase();
              const isSameColumn = m.column === removedMetric?.column;
              const areBothPerformanceMetric = !removedMetric?.column && m.column === DATASET_METRIC_COLUMN_VALUE;
              return !removedMetric || !(isSameMetric && (isSameColumn || areBothPerformanceMetric));
            }),
            resourceColumns: prevColumns.filter((c) => !removedColumn || c !== removedColumn),
          },
        };
        if (!isEqual(newState, prev)) {
          setQueryParamsState((prevPersistedConfig) => {
            return prevPersistedConfig
              ? { ...prevPersistedConfig, dataSource: structuredClone(newState.dataSource) }
              : undefined;
          });
          enqueueSnackbar({ title: removedColumn ? 'Metric target removed' : 'Metric removed' });
        }
        return newState;
      });
    },
    [enqueueSnackbar],
  );

  const hasNotAppliedChanges = (() => {
    const tempDateRange =
      tempControlsState.type === EvaluationAggregationType.DateRange ? tempSelectedDateRange : undefined;
    const persistedDateRange =
      queryParamsState?.type === EvaluationAggregationType.DateRange ? queryParamsState.dateRange : undefined;
    return !isEqual(
      {
        ...tempControlsState,
        dateRange: tempDateRange,
        tablePageSize: null,
      },
      {
        ...queryParamsState,
        dateRange: persistedDateRange,
        tablePageSize: null,
      },
    );
  })();

  const hasDisplayNameChanges = initialWidgetObject && displayName !== initialWidgetObject.displayName;

  const hasOnGoingChanges =
    queryParamsState && (!isEqual(initialWidgetObject?.params, queryParamsState) || hasDisplayNameChanges);

  useEffect(() => {
    // persist changes on temp state without trigger dashboard to save, when using the side controls from dashboard card
    if (!isEditWidgetPage && initialWidgetObject && hasOnGoingChanges) {
      onSave(
        {
          id: initialWidgetObject.id,
          displayName,
          type: widgetType,
          params: queryParamsState,
        },
        false,
      );
    }
  }, [displayName, hasOnGoingChanges, initialWidgetObject, isEditWidgetPage, onSave, queryParamsState, widgetType]);

  const setPersistedPageSize = (tablePageSize: number) => {
    setQueryParamsState((prev) => (prev ? { ...prev, tablePageSize } : undefined));
  };

  const onSaveWidget = () => {
    if (queryParamsState) {
      onSave({
        id: initialWidgetObject?.id || AppRoutePaths.newWidget,
        displayName,
        type: widgetType,
        params: queryParamsState,
      });
    }
    onClose?.();
  };

  const resourceSelector = (
    <WhyLabsSelect
      label="Resource:"
      error={invalidControls.has('resourceId')}
      placeholder="Select a model or dataset"
      loading={isLoadingResources}
      data={resourcesList}
      value={tempControlsState.resourceId ?? null}
      onChange={(value) => {
        if (value) clearInvalidFieldState(['resourceId']);
        setTempControlsState((prev) => {
          const isRefProfileComparison = prev.type === EvaluationAggregationType.ReferenceProfile;
          return {
            resourceId: value ?? undefined,
            // changing resource clear all the selections
            type: isRefProfileComparison
              ? EvaluationAggregationType.ReferenceProfile
              : EvaluationAggregationType.DateRange,
            tableColumnsDefinition: {
              type: isRefProfileComparison
                ? EvaluationColumnDefinitionType.ReferenceProfile
                : EvaluationColumnDefinitionType.Segment,
            },
          };
        });
      }}
    />
  );

  const handleTableColumnsManagement = () => {
    if (
      queryParamsState &&
      queryParamsState.resourceId === tempControlsState.resourceId &&
      queryParamsState.type === tempControlsState.type
    ) {
      return setDisplayColumnManagementModal('persistedParams');
    }
    return setDisplayColumnManagementModal('tempParams');
  };

  const groupByColumnsSelector = (() => {
    if (tempControlsState.type === EvaluationAggregationType.ReferenceProfile) {
      return (
        <WhyLabsButton
          variant="filled"
          color="gray"
          disabled={!tempControlsState.resourceId}
          disabledTooltip="Select a resource to load reference profiles"
          onClick={handleTableColumnsManagement}
          width="full"
          className={cx(classes.sideControlButton, classes.lightDisabledButton)}
          loading={isLoadingResources || isLoadingReferenceProfiles}
        >
          Manage selected reference profiles
        </WhyLabsButton>
      );
    }

    const isTempControlsOverallSegment =
      tempControlsState.tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment &&
      (tempControlsState.tableColumnsDefinition.groupBySegmentKey === OVERALL_SEGMENT_KEY_VALUE ||
        !tempControlsState.tableColumnsDefinition.groupBySegmentKey);
    return (
      <>
        <WhyLabsSelect
          label="Group by - columns"
          placeholder="Select a segment key"
          data={segmentKeysSelectorData}
          maxDropdownHeight={300}
          loading={isLoadingSegmentKeys}
          value={tempSegmentColumnDefinition?.groupBySegmentKey ?? null}
          onChange={(value) =>
            setTempControlsState((prev) => ({
              ...prev,
              tableColumnsDefinition: value
                ? { type: EvaluationColumnDefinitionType.Segment, groupBySegmentKey: value, segmentValues: [] }
                : undefined,
            }))
          }
          nothingFound={!tempControlsState.resourceId ? 'Select a resource to view segments' : undefined}
        />
        <WhyLabsButton
          variant="filled"
          color="gray"
          disabled={!tempControlsState.resourceId || isTempControlsOverallSegment}
          disabledTooltip={
            !tempControlsState.resourceId
              ? 'Select a resource to manage segments'
              : 'Segment management is available when grouping columns by segment'
          }
          onClick={handleTableColumnsManagement}
          width="full"
          className={cx(classes.sideControlButton, classes.lightDisabledButton)}
          loading={loadingSideControlsData || isLoadingColumnGroupSegmentValues}
        >
          Manage selected segments
        </WhyLabsButton>
      </>
    );
  })();

  return {
    orgId,
    widgetType,
    isEditWidgetPage,
    onChangeDisplayName,
    displaySideControls: {
      value: displaySideControls,
      setter: setDisplaySideControls,
    },
    viewMode: {
      value: viewMode,
      setter: setViewMode,
    },
    displayName,
    isEdited: hasOnGoingChanges,
    onSaveWidget,
    resourceColumnsList,
    onApplyParamsChanges,
    onChangeResourceColumns,
    onChangeMetrics,
    onChangeAggregationType,
    onChangeRowSegmentGrouping,
    dataControlsPickerTimePeriod,
    profileMetrics: {
      data: profileMetricsData,
      selectData: metricsSelectData,
      loading: isLoadingProfileMetrics,
    },
    resourceSegmentKeysList: {
      data: segmentKeysSelectorData,
      loading: isLoadingSegmentKeys,
    },
    queryParams: usedQueryParams,
    tempControlsState,
    datePickerState: {
      value: dateRangeState,
      setter: setDateRangeState,
    },
    commonSelectComponents: {
      resourceSelector,
      groupByColumnsSelector,
    },
    tempControlsErrorState: {
      value: invalidControls,
      setter: setInvalidControls,
    },
    displayColumnManagementModalState: {
      value: displayColumnManagementModal,
      setter: setDisplayColumnManagementModal,
    },
    loadingSideControlsData,
    hasNotAppliedChanges,
    onChangeColumnDefinitionSegmentValues,
    onChangeColumnDefinitionRefProfileValues,
    onChangeDataSource,
    setPersistedPageSize,
    handleMetricDeletion,
    loading: {
      resources: isLoadingResources,
      resourceColumns: resourceColumnsList.isLoading,
      segmentKeys: isLoadingSegmentKeys,
      metrics: isLoadingProfileMetrics,
      referenceProfiles: isLoadingReferenceProfiles,
    },
  };
};
