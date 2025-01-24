import { useState } from 'react';
import { Column, Table } from 'fixed-data-table-2';
import { HtmlTooltip, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { makeStyles } from '@material-ui/styles';
import { createStyles } from '@material-ui/core';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { asDatasetMetric } from 'utils/asDatasetMetric';
import { GetNotificationActionsQuery, useGetGlobalActionIdsQuery } from 'generated/graphql';
import { AlgorithmType, GlobalAction, RawWebhook, SendEmail, SlackWebhook } from 'generated/monitor-schema';

import { tooltips } from 'strings/tooltips';
import { timeLong } from 'utils/dateUtils';
import { SkeletonGroup, WhyLabsTooltip } from 'components/design-system';
import { useCommonStyles } from 'hooks/useCommonStyles';
import MonitorManagerTextCell from './cells/MonitorManagerCell';
import MonitorManagerHeaderCell from './cells/MonitorManagerHeaderCell';
import MonitorManagerStatusCell from './cells/MonitorManagerStatusCell';
import MonitorManagerActionCell from './cells/MonitorManagerActionCell';
import MonitorManagerAnomaliesCell, { AnomalyCellItem } from './cells/MonitorManagerAnomaliesCell';
import { isUnsupportedConfig } from '../../utils/mv3Utils';

const useStyles = makeStyles(() =>
  createStyles({
    tableRoot: {
      height: '100%',
      width: '100%',
    },
    '@global': {
      // Row class
      '.public_fixedDataTableRow_main': {
        // remove cell (column) border and prevent transparency
        '& .public_fixedDataTableCell_main': {
          borderRight: 'none',
        },
      },
    },
    flex: {
      display: 'flex',
    },
  }),
);

export interface TableItem {
  monitorId: string;
  tags: string[];
  analyzerId: string;
  enabled: boolean;
  monitorName: string;
  // lastMonitorRun: number;
  lastUpdated: number;
  schedule: string;
  monitorBaseline: string;
  metric: string;
  analyzerType: AlgorithmType;
  // notificationTrigger: string;
  anomalies: AnomalyCellItem[];
  includes: string[];
  excludes: string[];
  author: string | undefined;
  enabledActions: {
    actions: (GlobalAction | SendEmail | SlackWebhook | RawWebhook)[];
    global: GetNotificationActionsQuery | undefined;
  };
}

interface MonitorManagerMonitorsTableProps {
  tableItems: TableItem[];
  toggleMonitorStatus: (monitorId: string, stopLoading: () => void) => void;
  deleteMonitor: (monitorId: string, stopLoading: () => void, startLoading: () => void, displayName?: string) => void;
  readonly userCanManageMonitors: boolean;
}

type MonitorTargetType = 'input' | 'output' | 'perf';

const ROW_HEIGHT = 40;

const LoadingSkeleton = () => <SkeletonGroup count={1} height={40} width="100%" />;

function toStringArray(cellItem: string | boolean | AnomalyCellItem[] | string[] | undefined): string[] {
  if (Array.isArray(cellItem) && cellItem.length > 0 && typeof cellItem[0] === 'string') {
    return cellItem as string[];
  }
  return [];
}
function determineMonitorTargetType(metric: string, includes: string[], excludes: string[]): MonitorTargetType {
  const asMetric = asDatasetMetric(metric);
  if (asMetric) {
    return 'perf';
  }
  if (excludes.length > 0 && excludes.includes('grouping:outputs')) {
    return 'input';
  }
  if (excludes.length > 0 && excludes.includes('grouping:inputs')) {
    return 'output';
  }
  if (includes.length > 0 && includes.includes('grouping:inputs')) {
    return 'input';
  }
  if (includes.length > 0 && includes.includes('grouping:outputs')) {
    return 'output';
  }
  return 'input';
}

export default function MonitorManagerMonitorsTable({
  tableItems,
  toggleMonitorStatus,
  deleteMonitor,
  userCanManageMonitors,
}: MonitorManagerMonitorsTableProps): JSX.Element {
  const styles = useStyles();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const { modelId } = usePageTypeWithParams();
  const { handleNavigation } = useNavLinkHandler();
  const { classes: commonStyles } = useCommonStyles();
  const [loadingIndex, setLoadingIndex] = useState<number[]>([]);
  const { data: actionsData, loading: actionLoading } = useGetGlobalActionIdsQuery();
  function getColumnCellDataSafely<Type extends keyof TableItem>(
    data: TableItem[],
    rowIndex: number,
    dataAccessor: Type,
  ) {
    const maybeRowData = data[rowIndex]; // Try to get row data
    if (maybeRowData === undefined) return undefined;

    const maybeCellData = maybeRowData[dataAccessor]; // Try to get cell data
    if (maybeCellData === undefined) return undefined;
    return maybeCellData;
  }

  function stopLoading(rowIndex: number) {
    setLoadingIndex((indexList) => {
      if (indexList.includes(rowIndex)) return indexList.filter((index) => index !== rowIndex);

      return [...indexList, rowIndex];
    });
  }
  function startLoading(rowIndex: number) {
    setLoadingIndex((prev) => [...prev, rowIndex]);
  }

  const renderGlobalActionCell = (rowIndex: number): JSX.Element => {
    if (actionLoading) return <MonitorManagerTextCell content={<>Loading...</>} />;
    const enabledActions = getColumnCellDataSafely(tableItems, rowIndex, 'enabledActions');
    const actions = enabledActions?.actions ?? [];
    const quantity = actions.length;
    if (!quantity) return <MonitorManagerTextCell content={<>No monitor actions enabled</>} />;
    const handlePlural = quantity > 1 ? 'actions' : 'action';
    const actionsString = actions
      .map(({ target: actionId }) => {
        const globalAction = actionsData?.globalActions.listGlobalActions?.find(({ id }) => id === actionId);
        if (!globalAction) return `[Deleted] ${actionId}`;
        return globalAction.enabled ? actionId : `[Disabled] ${actionId}`;
      })
      .join(', ');
    return (
      <MonitorManagerTextCell
        content={
          <div className={styles.flex}>
            Triggers {actions.length}
            <WhyLabsTooltip maxWidth={400} label={`${actions.length > 1 ? 'Actions' : 'Action'}: ${actionsString}`}>
              &nbsp;<span className={commonStyles.dashedCta}>{handlePlural}</span>
            </WhyLabsTooltip>
          </div>
        }
      />
    );
  };

  return (
    <div className={styles.tableRoot}>
      <WhyLabsAutoSizer>
        {({ width, height }) => (
          <Table
            onRowMouseEnter={(event: React.SyntheticEvent<Table, Event>, rowIndex: number) => {
              setHoverIndex(rowIndex);
            }}
            onRowMouseLeave={(event: React.SyntheticEvent<Table, Event>, rowIndex: number) => {
              setHoverIndex(-1);
            }}
            rowHeight={ROW_HEIGHT}
            headerHeight={40}
            rowsCount={tableItems.length}
            width={width}
            maxHeight={height}
          >
            <Column
              width={120}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Status"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_status_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const isEnabled = getColumnCellDataSafely(tableItems, rowIndex, 'enabled');
                const monitorId = getColumnCellDataSafely(tableItems, rowIndex, 'monitorId');
                const isLoading = loadingIndex.includes(rowIndex);

                if (isLoading) return <LoadingSkeleton />;
                if (typeof isEnabled !== 'boolean' || typeof monitorId !== 'string')
                  return <MonitorManagerTextCell content={<>No data</>} />; // TODO: Create proper no data cell

                return (
                  <MonitorManagerStatusCell
                    key={`${monitorId}--enabled:${isEnabled}`}
                    enabled={isEnabled}
                    onChange={() => {
                      setLoadingIndex((prev) => [...prev, rowIndex]);
                      toggleMonitorStatus(monitorId, () => stopLoading(rowIndex));
                    }}
                    userCanEdit={userCanManageMonitors}
                  />
                ); // standard text cell
              }}
            />

            <Column
              width={300}
              flexGrow={1}
              header={
                <MonitorManagerHeaderCell
                  cellText="Monitor name"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_monitor_name_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const data = getColumnCellDataSafely(tableItems, rowIndex, 'monitorName');
                const isLoading = loadingIndex.includes(rowIndex);
                const isEnabled = getColumnCellDataSafely(tableItems, rowIndex, 'enabled');

                if (isLoading) return <LoadingSkeleton />;
                if (data === undefined) return <MonitorManagerTextCell enabled={isEnabled} content={<>No data</>} />; // TODO: Create proper no data cell

                return <MonitorManagerTextCell enabled={isEnabled} content={<>{data}</>} />;
              }}
            />
            <Column
              width={180}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Last modified"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_last_modified_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const isLoading = loadingIndex.includes(rowIndex);
                const isEnabled = getColumnCellDataSafely(tableItems, rowIndex, 'enabled');
                const lastUpdated = getColumnCellDataSafely(tableItems, rowIndex, 'lastUpdated');

                if (isLoading) return <LoadingSkeleton />;
                return (
                  <MonitorManagerTextCell
                    enabled={isEnabled}
                    content={<>{lastUpdated ? timeLong(lastUpdated) : 'N/A'}</>}
                  />
                );
              }}
            />

            <Column
              width={100}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Schedule"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_schedule_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const data = getColumnCellDataSafely(tableItems, rowIndex, 'schedule');
                const isLoading = loadingIndex.includes(rowIndex);
                const isEnabled = getColumnCellDataSafely(tableItems, rowIndex, 'enabled');

                if (isLoading) return <LoadingSkeleton />;
                if (data === undefined) return <MonitorManagerTextCell enabled={isEnabled} content={<>No data</>} />; // TODO: Create proper no data cell

                return <MonitorManagerTextCell enabled={isEnabled} content={<>{data}</>} />; // standard text cell
              }}
            />

            <Column
              width={220}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Monitor baseline"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_monitor_baseline_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const data = getColumnCellDataSafely(tableItems, rowIndex, 'monitorBaseline');
                const isLoading = loadingIndex.includes(rowIndex);
                const isEnabled = getColumnCellDataSafely(tableItems, rowIndex, 'enabled');

                if (isLoading) return <LoadingSkeleton />;
                if (data === undefined) return <MonitorManagerTextCell enabled={isEnabled} content={<>No data</>} />; // TODO: Create proper no data cell

                return <MonitorManagerTextCell enabled={isEnabled} content={<>{data}</>} />;
              }}
            />

            <Column
              width={205}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Anomaly activity"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_anomaly_activity_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const data = getColumnCellDataSafely(tableItems, rowIndex, 'anomalies');
                const isLoading = loadingIndex.includes(rowIndex);
                if (isLoading) return <LoadingSkeleton />;

                if (data && data.length > 0 && !!data[0].timestamp) {
                  return <MonitorManagerAnomaliesCell data={data} />;
                }
                return <MonitorManagerAnomaliesCell data={[]} />;
              }}
            />
            <Column
              width={225}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Monitor actions"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_monitor_actions_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const isLoading = loadingIndex.includes(rowIndex);
                if (isLoading) return <LoadingSkeleton />;
                return renderGlobalActionCell(rowIndex);
              }}
            />

            <Column
              width={200}
              flexGrow={0}
              header={
                <MonitorManagerHeaderCell
                  cellText="Options"
                  renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_table_user_actions_col} />}
                />
              }
              cell={({ rowIndex }) => {
                const isHovered = hoverIndex === rowIndex;
                const monitorId = getColumnCellDataSafely(tableItems, rowIndex, 'monitorId');
                const displayName = getColumnCellDataSafely(tableItems, rowIndex, 'monitorName');
                const monitorTags = getColumnCellDataSafely(tableItems, rowIndex, 'tags') ?? [];
                const metric = getColumnCellDataSafely(tableItems, rowIndex, 'metric') as string;
                const includes = toStringArray(getColumnCellDataSafely(tableItems, rowIndex, 'includes'));
                const excludes = toStringArray(getColumnCellDataSafely(tableItems, rowIndex, 'excludes'));
                const analyzerType = getColumnCellDataSafely(tableItems, rowIndex, 'analyzerType');
                const monitorType = determineMonitorTargetType(metric, includes, excludes);
                const isLoading = loadingIndex.includes(rowIndex);
                const showViewMonitor = monitorType === 'input' || monitorType === 'perf' || monitorType === 'output';

                if (isLoading) return <LoadingSkeleton />;
                if (typeof monitorId !== 'string') return <MonitorManagerTextCell content={<>No data</>} />;

                return (
                  <MonitorManagerActionCell
                    showControls={isHovered}
                    onEditActionClick={() =>
                      handleNavigation({
                        page: 'monitorManager',
                        modelId,
                        monitorManager: { path: 'customize-ui', id: monitorId },
                      })
                    }
                    onDeleteActionClick={() => {
                      deleteMonitor(
                        monitorId,
                        () => stopLoading(rowIndex),
                        () => startLoading(rowIndex),
                        displayName,
                      );
                    }}
                    onChartActionClick={() => {
                      handleNavigation({
                        page: 'monitorManager',
                        modelId,
                        monitorManager: { path: 'anomalies-feed' },
                        setParams: [{ name: 'monitor', value: monitorId }],
                      });
                    }}
                    onJsonActionClick={() => {
                      return handleNavigation({
                        page: 'monitorManager',
                        modelId,
                        monitorManager: { path: 'config-investigator', id: monitorId },
                      });
                    }}
                    editDisabled={!userCanManageMonitors}
                    unsupportedConfig={isUnsupportedConfig(metric, monitorTags, analyzerType)}
                    showViewMonitor={showViewMonitor}
                  />
                );
              }}
            />
          </Table>
        )}
      </WhyLabsAutoSizer>
    </div>
  );
}
