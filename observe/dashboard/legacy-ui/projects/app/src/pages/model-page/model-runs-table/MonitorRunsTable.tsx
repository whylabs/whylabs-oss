import { useMemo } from 'react';
import { NoDataMessage, WhyLabsAutoSizer, HtmlTooltip, TextCell, HeaderCell } from '@whylabs/observatory-lib';
import { TableLoading } from 'components/controls/TableLoading';
import { Column, Table } from 'fixed-data-table-2';
import { AnalyzerRunResult } from 'generated/graphql';
import { tooltips } from 'strings/tooltips';
import { MonitorSchema } from 'monitor-schema-types';
import { Monitor } from 'generated/monitor-schema';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import HeaderCellSortSelect from 'pages/model-page/HeaderCellSortSelect';
import { AnomalySortType, SortDirectionType } from 'hooks/useSort/types';
import MonitorManagerEmptyState from 'components/panels/monitoring/monitor-manager/monitors-tab/components/MonitorManagerEmptyState';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { getAnalyzerMetric } from 'hooks/useCustomMonitor/monitorUtils';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsText } from 'components/design-system';
import RunsTimestampCell from './cells/RunTimestampCell';
import LinkCell from './cells/LinkCell';
import CountCell from './cells/CountCell';
import OverflowTextCell from './cells/OverflowTextCell';

export interface MonitorRunsTableProps {
  readonly loading: boolean;
  readonly error: boolean;
  readonly data: AnalyzerRunResult[];
  readonly modelId: string;
  readonly schema: MonitorSchema | undefined;
  readonly sortDirection: SortDirectionType;
  readonly sortBy: AnomalySortType | undefined;
  readonly setSort: (sortBy: AnomalySortType, sortDirection: SortDirectionType) => void;
  readonly userCanManageMonitors: boolean;
}

const analyzerMetric = (item: AnalyzerRunResult, schema?: MonitorSchema): string => {
  const analyzer = schema?.analyzers?.find((a) => a.id === item.analyzerId);
  const metric = analyzer ? getAnalyzerMetric(analyzer.config) : 'N/A';
  return metric.toUpperCase();
};

export function MonitorRunsTable({
  loading,
  error,
  data,
  modelId,
  schema,
  sortDirection,
  sortBy,
  setSort,
  userCanManageMonitors,
}: MonitorRunsTableProps): JSX.Element {
  const { getNavUrl } = useNavLinkHandler();
  const { classes: commonStyles } = useCommonStyles();
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);
  const monitorsById = useMemo(() => {
    const ids = new Map<string, Monitor>();
    schema?.monitors.forEach((m) => {
      if (m.id) {
        ids.set(m.id, m);
      }
    });
    return ids;
  }, [schema]);

  if (loading) {
    return <TableLoading />;
  }

  if (error) {
    console.error('Error looking up analyzer runs', error);
    return (
      <NoDataMessage>
        <WhyLabsText inherit className={commonStyles.commonFont}>
          Error loading analyzer runs
        </WhyLabsText>
      </NoDataMessage>
    );
  }

  if (data.length === 0) {
    return (
      <NoDataMessage>
        {!isEmptyMonitor ? (
          <WhyLabsText inherit className={commonStyles.commonFont}>
            No analyzer runs found
          </WhyLabsText>
        ) : (
          <MonitorManagerEmptyState modelId={modelId} userCanEdit={userCanManageMonitors} />
        )}
      </NoDataMessage>
    );
  }

  const countColWidth = 160;
  return (
    <WhyLabsAutoSizer>
      {({ height, width }) => (
        <Table rowHeight={40} headerHeight={40} rowsCount={data.length} width={width} height={height}>
          <Column
            header={
              <HeaderCellSortSelect
                header="Run completed"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.monitor_runs_run_completed} />}
                sortDirection={sortBy === 'timestamp' ? sortDirection : undefined}
                onSortDirectionChange={(nextSortDir) => setSort('timestamp', nextSortDir)}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];

              return <RunsTimestampCell timestamp={item.runCompleted ?? 0} />;
            }}
            width={220}
          />

          <Column
            align="right"
            header={
              <HeaderCell
                header="Column count"
                renderTooltip={() => (
                  <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_column_count} />
                )}
              />
            }
            cell={({ rowIndex, width: w }) => {
              const item = data[rowIndex];
              return <CountCell width={w} count={item?.columnCount} />;
            }}
            width={countColWidth}
          />

          <Column
            align="right"
            header={
              <HeaderCell
                header="Anomalies detected"
                renderTooltip={() => (
                  <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_anomaly_count} />
                )}
              />
            }
            cell={({ rowIndex, width: w }) => {
              const item = data[rowIndex];
              return <CountCell width={w} count={item?.anomalyCount} />;
            }}
            width={countColWidth}
          />
          <Column
            header={
              <HeaderCell
                header="Analysis type"
                renderTooltip={() => (
                  <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_analysis_type} />
                )}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              return <TextCell>{analyzerMetric(item, schema)}</TextCell>;
            }}
            width={200}
            flexGrow={1}
          />

          <Column
            header={
              <HeaderCell
                header="Messages"
                renderTooltip={() => <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_messages} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];

              return <OverflowTextCell text={item?.failureTypes?.join(', ') ?? ''} />;
            }}
            width={400}
          />

          <Column
            header={
              <HeaderCell
                header="Monitor name"
                renderTooltip={() => <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.anomalyMonitorName} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const firstId = item.monitorIds ? item.monitorIds[0] : undefined;
              const firstMonitor = firstId ? monitorsById.get(firstId) : undefined;
              const firstName = firstMonitor ? (firstMonitor.displayName || firstId) ?? '' : '';

              const pluralText =
                !!item.monitorIds && item.monitorIds.length > 1 ? ` and ${item.monitorIds.length - 1} more` : '';

              return (
                <LinkCell
                  linkedText={firstName}
                  link={
                    item.monitorIds?.length && userCanManageMonitors
                      ? getNavUrl({
                          page: 'monitorManager',
                          modelId,
                          monitorManager: { path: 'customize-ui', id: item.monitorIds[0] },
                        })
                      : ''
                  }
                  unlinkedText={pluralText}
                />
              );
            }}
            width={320}
          />

          <Column
            header={
              <HeaderCell
                header="Analyzer ID"
                renderTooltip={() => (
                  <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_analyzer_id} />
                )}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              return <OverflowTextCell text={item.analyzerId ?? ''} />;
            }}
            width={320}
          />

          <Column
            header={
              <HeaderCell
                header="Run ID"
                renderTooltip={() => <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.monitor_runs_run_id} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              return <TextCell>{item.runId ?? ''}</TextCell>;
            }}
            width={300}
          />
        </Table>
      )}
    </WhyLabsAutoSizer>
  );
}
