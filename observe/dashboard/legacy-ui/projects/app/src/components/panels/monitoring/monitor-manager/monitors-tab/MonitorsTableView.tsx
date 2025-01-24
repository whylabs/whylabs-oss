import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Analyzer, Monitor } from 'generated/monitor-schema';
import { analyzerConfigToBaselineText, monitorLastUpdated, scheduleToText } from 'adapters/monitor-adapters';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Skeleton } from '@material-ui/lab';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import { useGetNotificationActionsQuery } from 'generated/graphql';
import { isNotNullish } from 'utils/nullUtils';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import useGetMonitoringProfilesList from 'hooks/useGetMonitoringProfilesList';
import { getAnalyzerMetric } from 'hooks/useCustomMonitor/monitorUtils';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import WhyLabsConfirmationDialog from 'components/design-system/modal/WhyLabsConfirmationDialog';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText, WhyLabsTextInput } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { isString } from 'utils/typeGuards';
import useMonitorSchema from '../hooks/useMonitorSchema';
import useGetAnomaliesForMonitors from './hooks/useGetAnomaliesForMonitors';
import MonitorManagerMonitorsTable, { TableItem } from './components/MonitorManagerMonitorsTable';
import { AnomalyCellItem } from './components/cells/MonitorManagerAnomaliesCell';
import MonitorManagerEmptyState from './components/MonitorManagerEmptyState';

const useStyles = createStyles({
  root: {
    height: '100%',
    width: '100%',
    position: 'relative',
  },
  block: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 101,
  },
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 25,
    paddingTop: 25,
    paddingBottom: 10,
  },
  deleteDialogTextCommon: {
    fontFamily: 'Asap',
    fontSize: 14,
    lineHeight: 1.42,
    fontWeight: 400,
  },
  deleteMonitorName: {
    padding: '3px 0px 3px 15px',
    borderRadius: '4px',
    borderLeft: `4px solid ${Colors.red}`,
    background: Colors.lightRed2,
    color: 'black',
  },
  deleteDialogText: {
    color: 'black',
  },
  deleteDialogInputLabel: {
    color: Colors.secondaryLight1000,
    paddingBottom: 4,
  },
});

interface MonitorsTableViewProps {
  userCanManageMonitors: boolean;
}

const DELETE_TYPE_CONFIRMATION = 'delete monitor';

export default function MonitorsTableView({ userCanManageMonitors }: MonitorsTableViewProps): JSX.Element {
  useSetHtmlTitle('Monitors');

  const { classes: styles, cx } = useStyles();
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const { modelId } = usePageTypeWithParams();
  const {
    monitorSchema,
    updateMonitor,
    updateMonitorAndAnalyzer,
    deleteMonitorAndAnalyzer,
    error: schemaError,
    queryLoading,
  } = useMonitorSchema({
    modelId,
  });
  const {
    resourceState: { resource },
  } = useResourceContext();
  const { referenceProfiles } = useGetMonitoringProfilesList(modelId);
  const {
    data: notificationData,
    loading: notificationLoading,
    error: notificationError,
  } = useGetNotificationActionsQuery();
  const {
    loading: anomaliesLoading,
    data: monitorAnomalyMap,
    error: anomaliesError,
  } = useGetAnomaliesForMonitors(monitorSchema?.monitors?.map((m) => m.id)?.filter(isNotNullish) ?? []);
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [blockUI, setBlockUI] = useState(false);
  const [deletionMonitorName, setDeletionMonitorName] = useState<string | null>(null);
  const [deletionTypeConfirmation, setDeletionTypeConfirmation] = useState<string | null>(null);

  const displayDeleteDialog = (monitorName: string | null) => {
    setDeletionMonitorName(monitorName);
    setDeletionTypeConfirmation(null);
  };

  const deleteCallback = useRef<(() => void) | undefined>(undefined);
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);
  const loading = useMemo(() => {
    return queryLoading || anomaliesLoading || notificationLoading;
  }, [queryLoading, anomaliesLoading, notificationLoading]);

  const error = useMemo(() => {
    return !!(schemaError || anomaliesError || notificationError);
  }, [schemaError, anomaliesError, notificationError]);

  const getAnalyzer = useCallback(
    (analyzerIds: string[]): Analyzer | undefined => {
      if (!monitorSchema) return undefined;
      const { analyzers } = monitorSchema;
      if (analyzerIds.length === 0) return undefined;
      if (analyzerIds.length > 1) {
        // this is bad, because it means we might only remove the first analyzer rather than all, for example
        console.error('Found more than one analyzer in analyzer array. This is not yet supported!');
      }

      return analyzers.find((a) => a.id === analyzerIds[0]);
    },
    [monitorSchema],
  );

  const getAnomalies = useCallback(
    (monitorId: string | undefined): AnomalyCellItem[] => {
      if (!monitorAnomalyMap || !monitorId) return [];
      const anomaliesMap = monitorAnomalyMap.get(monitorId);
      if (!anomaliesMap) return [];
      const anomalyEntries = Array.from(anomaliesMap.entries());

      return anomalyEntries.map(([timestamp, count]) => ({ count, timestamp }));
    },
    [monitorAnomalyMap],
  );

  const createTableRow = useCallback(
    (analyzer: Analyzer, monitor: Monitor): TableItem => {
      const anomalies = getAnomalies(monitor.id);
      const includes = analyzer.targetMatrix?.type === 'column' ? analyzer.targetMatrix.include ?? [] : [];
      const excludes = analyzer.targetMatrix?.type === 'column' ? analyzer.targetMatrix.exclude ?? [] : [];

      return {
        metric: getAnalyzerMetric(analyzer.config),
        analyzerType: analyzer.config.type,
        tags: [...(monitor.tags ?? []), ...(analyzer.tags ?? [])],
        monitorId: monitor.id ?? '',
        analyzerId: analyzer.id ?? '',
        monitorName: monitor.displayName || monitor.id || '',
        lastUpdated: monitorLastUpdated(monitor, [analyzer]),
        schedule: scheduleToText(monitor.schedule),
        monitorBaseline: analyzerConfigToBaselineText(
          analyzer.config,
          monitor.schedule,
          resource?.batchFrequency,
          referenceProfiles,
        ),
        enabled: !monitor.disabled,
        anomalies,
        includes,
        excludes,
        author: monitor.metadata?.author || undefined,
        enabledActions: {
          actions: monitor.actions,
          global: notificationData,
        },
      };
    },
    [getAnomalies, resource?.batchFrequency, referenceProfiles, notificationData],
  );

  const monitorSchemaToTableRows = useCallback((): TableItem[] | undefined => {
    const items: TableItem[] = [];
    if (!monitorSchema) return undefined;
    const { monitors } = monitorSchema;

    monitors.forEach((monitor) => {
      const analyzer = getAnalyzer(monitor.analyzerIds);
      if (!analyzer) return;

      const row = createTableRow(analyzer, monitor);
      items.push(row);
    });

    return items;
  }, [createTableRow, getAnalyzer, monitorSchema]);

  const getMonitor = useCallback(
    (monitorId: string): Monitor | undefined => {
      if (!monitorSchema) return undefined;
      const { monitors } = monitorSchema;

      const monitor = monitors.find((m) => m.id === monitorId);
      if (!monitor) console.log('Unable to find monitor in MonitorsTableView');

      return monitor;
    },
    [monitorSchema],
  );

  const displayErrorSnackbar = useCallback(
    (title?: string) => {
      const usedTitle = isString(title) ? title : 'Failed to update monitor';
      enqueueSnackbar({
        title: usedTitle,
        variant: 'warning',
      });
    },
    [enqueueSnackbar],
  );

  const toggleMonitorStatus = useCallback(
    (monitorId: string, stopLoading: () => void) => {
      const monitor = getMonitor(monitorId);
      if (!monitor || !monitorSchema) {
        displayErrorSnackbar();
        return;
      }
      const analyzer = getAnalyzer(monitor.analyzerIds);
      const updatedDisabledState = !monitor.disabled;
      const updatedMonitor: Monitor = {
        ...monitor,
        disabled: updatedDisabledState,
      };
      const updatedAnalyzer: Analyzer | null = analyzer
        ? {
            ...analyzer,
            disabled: updatedDisabledState,
          }
        : null;
      setBlockUI(true);

      function successCallback() {
        setTableData((state) => {
          const newState = [...state];
          const current = newState.find((item) => item.monitorId === monitorId);
          if (current) {
            current.enabled = !!monitor?.disabled;
          }
          return newState;
        });
        enqueueSnackbar({ title: 'Successfully updated monitor' });
      }

      function finishedLoading() {
        stopLoading();
        setBlockUI(false);
      }

      if (updatedAnalyzer) {
        updateMonitorAndAnalyzer({
          monitor: updatedMonitor,
          analyzer: updatedAnalyzer,
        })
          .then(successCallback)
          .catch(displayErrorSnackbar)
          .finally(finishedLoading);
      } else {
        updateMonitor(monitorId, updatedMonitor)
          .then(successCallback)
          .catch(displayErrorSnackbar)
          .finally(finishedLoading);
      }
    },
    [
      getMonitor,
      monitorSchema,
      getAnalyzer,
      displayErrorSnackbar,
      enqueueSnackbar,
      updateMonitorAndAnalyzer,
      updateMonitor,
    ],
  );

  const createDeleteMonitorFunction = useCallback(
    (monitorId: string, stopLoading: () => void, startLoading: () => void) => {
      return function deleteMonitor() {
        startLoading();
        const monitor = getMonitor(monitorId);
        if (!monitor || !monitorSchema) {
          displayErrorSnackbar('Failed to delete monitor.');
          return;
        }

        const analyzer = getAnalyzer(monitor.analyzerIds);
        deleteMonitorAndAnalyzer(monitorId, analyzer?.id)
          .then(() => {
            setTableData((state) => {
              const newState = [...state];
              const current = newState.findIndex((item) => item.monitorId === monitorId);
              if (current !== -1) {
                newState.splice(current, 1);
              }
              return newState;
            });
            stopLoading();
            enqueueSnackbar({ title: 'Successfully removed monitor' });
          })
          .catch((err) => {
            stopLoading();
            enqueueErrorSnackbar({ explanation: 'Failed to remove monitor', err });
          });
      };
    },
    [
      deleteMonitorAndAnalyzer,
      displayErrorSnackbar,
      enqueueErrorSnackbar,
      enqueueSnackbar,
      getAnalyzer,
      getMonitor,
      monitorSchema,
    ],
  );
  const [cachedEnabledMonitors, setCachedEnabledMonitors] = useState<Map<string, boolean>>();
  const sortMonitors = useCallback(
    (currentDataArray: TableItem[]) =>
      currentDataArray.sort(
        (monitorA, monitorB) =>
          Number(cachedEnabledMonitors?.get(monitorB.monitorId) ?? false) -
            Number(cachedEnabledMonitors?.get(monitorA.monitorId) ?? false) ||
          monitorB.lastUpdated - monitorA.lastUpdated,
      ),
    [cachedEnabledMonitors],
  );
  if (tableData?.length && !cachedEnabledMonitors) {
    const cachedMapper = new Map<string, boolean>(tableData.map((item) => [item.monitorId, item.enabled]));
    setCachedEnabledMonitors(cachedMapper);
  }

  useEffect(() => {
    if (monitorSchema?.monitors) {
      const tableRows = monitorSchemaToTableRows();
      if (tableRows) setTableData(sortMonitors(tableRows));
    }
  }, [monitorSchema, monitorSchemaToTableRows, sortMonitors]);

  if (loading) {
    return (
      <div>
        <Skeleton height="45px" width="100%" style={{ marginBottom: '10px', transform: 'unset' }} />
        <Skeleton height="400px" width="100%" style={{ transform: 'unset' }} />
      </div>
    );
  }
  if (error) {
    console.log('Failed to fetch monitor schema');
    return (
      <AttentionPageWrap
        title="Whoops"
        subtitle="Something went wrong, please reload the page or contact whylabs support"
        dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
      />
    );
  }

  return (
    <div className={styles.root}>
      {blockUI && <div className={styles.block} />}
      {isEmptyMonitor ? (
        <MonitorManagerEmptyState modelId={modelId} userCanEdit={userCanManageMonitors} />
      ) : (
        <MonitorManagerMonitorsTable
          tableItems={tableData}
          deleteMonitor={(monitorId, stopLoading, startLoading, displayName) => {
            displayDeleteDialog(displayName || monitorId);
            deleteCallback.current = createDeleteMonitorFunction(monitorId, stopLoading, startLoading);
          }}
          toggleMonitorStatus={(monitorId, stopLoading) => toggleMonitorStatus(monitorId, stopLoading)}
          userCanManageMonitors={userCanManageMonitors}
        />
      )}
      <WhyLabsConfirmationDialog
        isOpen={!!deletionMonitorName}
        dialogTitle="Delete monitor and analysis results?"
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={() => displayDeleteDialog(null)}
        onConfirm={() => {
          displayDeleteDialog(null);
          if (deleteCallback.current) deleteCallback.current();
        }}
        modalSize="440px"
        disabledConfirmButton={deletionTypeConfirmation !== DELETE_TYPE_CONFIRMATION}
      >
        <div className={styles.confirmDeletionDialogFlex}>
          <div className={cx(styles.deleteDialogTextCommon, styles.deleteMonitorName)}>
            {deletionMonitorName || '-'}
          </div>
          <WhyLabsText className={cx(styles.deleteDialogTextCommon, styles.deleteDialogText)}>
            To keep analysis results, disable the monitor with the toggle in the monitor manager table.
          </WhyLabsText>
          <div>
            <WhyLabsText className={cx(styles.deleteDialogTextCommon, styles.deleteDialogInputLabel)}>
              Type &apos;{DELETE_TYPE_CONFIRMATION}&apos; to confirm:
            </WhyLabsText>
            <WhyLabsTextInput
              label=""
              hideLabel
              placeholder="Type confirmation"
              onChange={(text) => setDeletionTypeConfirmation(text)}
            />
          </div>
        </div>
      </WhyLabsConfirmationDialog>
    </div>
  );
}
