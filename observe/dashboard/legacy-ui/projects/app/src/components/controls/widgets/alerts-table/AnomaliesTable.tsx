import { useMemo, useRef } from 'react';
import { HeaderCell, HtmlTooltip, NoDataMessage, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { TableLoading } from 'components/controls/TableLoading';
import { Column, Table } from 'fixed-data-table-2';
import { AnalysisDataFragment, AnalysisMetric, useGetOutputNamesQuery } from 'generated/graphql';
import { tooltips } from 'strings/tooltips';
import { generateEventDescription, getCardTypeTypeByDecoration, getDecorationTypeByMetric } from 'utils/analysisUtils';
import { MonitorSchema } from 'monitor-schema-types';
import { Monitor } from 'generated/monitor-schema';
import HeaderCellSortSelect from 'pages/model-page/HeaderCellSortSelect';
import { AnomalySortType, SortDirectionType } from 'hooks/useSort/types';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import MonitorManagerEmptyState from 'components/panels/monitoring/monitor-manager/monitors-tab/components/MonitorManagerEmptyState';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { EncodedAnalysisInfo, useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ANALYZER_FILTER } from 'types/navTags';
import { WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { ApolloError } from '@apollo/client';
import { useGraphQLErrorHandler } from 'hooks/useGraphQLErrorHandler';
import { useCommonStyles } from 'hooks/useCommonStyles';
import AlertTimestampCell from './cells/AlertTimestampCell';
import AlertTypeCell from './cells/AlertTypeCell';
import TextWithActionButtonCell from './cells/TextWithActionButtonCell';
import AlertDetailsCell from './cells/AlertDetailsCell';
import AnomalyDetailCell from './cells/AnomalyDetailCell';
import AnomalyDetailsCell from './cells/AnomalyDetailsCell';

export interface AnomaliesTableProps {
  readonly loading: boolean;
  readonly error?: ApolloError;
  readonly data: AnalysisDataFragment[];
  readonly modelId: string;
  readonly schema: MonitorSchema | undefined;
  readonly sortDirection: SortDirectionType;
  readonly sortBy: AnomalySortType | undefined;
  readonly setSort: (sortBy: AnomalySortType, sortDirection: SortDirectionType) => void;
  readonly userCanManageMonitors: boolean;
  readonly anomaliesOnly: boolean;
}
const CELL_PADDING = 10 * 2;
const TEXT_CELLS_PADDING = 8 * 2 + CELL_PADDING;
export function AnomaliesTable({
  loading,
  error,
  data,
  modelId,
  schema,
  sortDirection,
  sortBy,
  setSort,
  userCanManageMonitors,
  anomaliesOnly,
}: AnomaliesTableProps): JSX.Element {
  const { getNavUrl, handleNavigation } = useNavLinkHandler();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const pt = usePageTypeWithParams();
  const { modelId: datasetId } = pt;
  const { classes } = useCommonStyles();
  const { data: outputData } = useGetOutputNamesQuery({
    variables: { datasetId, ...dateRange },
    skip: loadingDateRange,
  });
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);
  const tableRef = useRef<Table>(null);
  const { encodeState } = useStateUrlEncoder();
  useGraphQLErrorHandler(error);
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
    console.error('Error looking up anomaly data', error);
    return (
      <NoDataMessage>
        <WhyLabsText inherit>Error loading anomalies</WhyLabsText>
      </NoDataMessage>
    );
  }

  if (data.length === 0) {
    return (
      <NoDataMessage>
        {!isEmptyMonitor ? (
          <WhyLabsText inherit className={classes.commonFont}>{`No ${
            anomaliesOnly ? 'anomalies' : 'events'
          } found`}</WhyLabsText>
        ) : (
          <MonitorManagerEmptyState modelId={modelId} userCanEdit={userCanManageMonitors} />
        )}
      </NoDataMessage>
    );
  }

  const generateAnalysisWithContextUrl = (item: AnalysisDataFragment): string => {
    const decoration = getDecorationTypeByMetric(item?.metric ?? AnalysisMetric.Unknown);
    const selectedProfile = item?.datasetTimestamp ?? 0;
    const actionState: EncodedAnalysisInfo = {
      analyzerId: item.analyzerId ?? '',
      graphDecorationType: decoration,
      scrollToCard: getCardTypeTypeByDecoration(decoration),
    };
    const encodedActionState = encodeState(actionState);
    return getNavUrl({
      page: 'columns',
      modelId,
      segmentTags: { tags: item.tags },
      featureName: item.column ?? '',
      setParams: [
        { name: 'userActionState', value: encodedActionState },
        { name: 'selectedTimestamp', value: selectedProfile.toString() },
      ],
    });
  };

  return (
    <WhyLabsAutoSizer>
      {({ height, width }) => (
        <Table rowHeight={40} headerHeight={40} rowsCount={data.length} width={width} height={height} ref={tableRef}>
          <Column
            header={
              <HeaderCellSortSelect
                header="Batch timestamp"
                renderTooltip={() => <></>}
                sortDirection={sortBy === 'timestamp' ? sortDirection : undefined}
                onSortDirectionChange={(nextSortDir) => setSort('timestamp', nextSortDir)}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];

              return (
                <AlertTimestampCell
                  isUnhelpful={!!item.isFalseAlarm}
                  creationTimestamp={item.creationTimestamp ?? 0}
                  timestamp={item.datasetTimestamp ?? 0}
                />
              );
            }}
            width={200}
          />
          <Column
            header={
              <HeaderCell
                header="Metric"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalyMetric} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              return (
                <AlertTypeCell
                  width={150 - TEXT_CELLS_PADDING}
                  isUnhelpful={!!item.isFalseAlarm}
                  type={item.metric ?? ''}
                  tooltip={item.metric ?? ''}
                />
              );
            }}
            width={150}
          />
          <Column
            header={
              <HeaderCell
                header="Target"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalyTarget} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const outputNames = outputData?.model?.outputs.map((output) => output.name);
              let tooltip = '<navigation to metric not supported yet>';
              const perfMetrics = [
                'CLASSIFICATION_ACCURACY',
                'CLASSIFICATION_RECALL',
                'CLASSIFICATION_FPR',
                'CLASSIFICATION_PRECISION',
                'CLASSIFICATION_F1',
                'CLASSIFICATION_AUC',
                'REGRESSION_MSE',
                'REGRESSION_MAE',
                'REGRESSION_MAE',
                'REGRESSION_RMSE',
                'SECONDS_SINCE_LAST_UPLOAD',
              ];
              const renderLink = () => {
                if (outputNames?.includes(item.column ?? '')) {
                  tooltip = `Navigate to column view: ${item.column}`;
                  return getNavUrl({
                    page: 'output',
                    modelId,
                    segmentTags: { tags: item.tags },
                    featureName: item.column ?? '',
                  });
                }
                if (perfMetrics.includes(item.metric ?? '') || item.category === 'Performance') {
                  tooltip = `Navigate to performance page`;
                  return getNavUrl({ page: 'performance', modelId, segmentTags: { tags: item.tags } });
                }
                tooltip = `Navigate to column view: ${item.column}`;
                return generateAnalysisWithContextUrl(item);
              };
              const useCategoryName = item.category === 'Performance' || item.category === 'Ingestion';
              const disableLink = item.category === 'Ingestion';

              return (
                <AnomalyDetailCell
                  width={340 - TEXT_CELLS_PADDING}
                  isUnhelpful={!!item.isFalseAlarm}
                  text={useCategoryName ? item.category!.toLowerCase() : item.column ?? ''}
                  link={disableLink ? undefined : renderLink()}
                  tooltip={tooltip}
                />
              );
            }}
            width={260}
          />
          <Column
            header={
              <HeaderCell
                header="Analyzer type"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalyAnalyzerType} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              let cellText = `${item.analyzerType ?? ''}`;
              if (item.algorithm !== null) {
                cellText += `- ${item.algorithm}`;
              }

              return (
                <AlertTypeCell
                  width={160 - TEXT_CELLS_PADDING}
                  isUnhelpful={!!item.isFalseAlarm}
                  type={cellText}
                  tooltip={cellText}
                />
              );
            }}
            width={160}
          />
          <Column
            header={
              <HeaderCell
                header={anomaliesOnly ? 'Anomaly details' : 'Event description'}
                renderTooltip={() => (
                  <HtmlTooltip tooltipContent={anomaliesOnly ? tooltips.anomalyDetails : tooltips.eventDescription} />
                )}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const cellText = generateEventDescription(item) || '<detail text not available>';

              return (
                <AnomalyDetailsCell width={400 - TEXT_CELLS_PADDING} text={cellText} details={item} highlightAnomaly />
              );
            }}
            width={400}
            flexGrow={1}
          />
          <Column
            header={
              <HeaderCell
                header="Monitor name"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalyMonitorName} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const firstId = item.monitorIds?.[0];
              const firstMonitor = monitorsById.get(firstId ?? '');
              const deletedName = item.analyzerId ? `Deleted monitor (${item.analyzerId})` : '';
              const firstName = firstMonitor?.displayName || firstId || deletedName;
              const { analyzerId } = item;
              const pluralText =
                !!item.monitorIds && item.monitorIds.length > 1 ? ` and ${item.monitorIds.length - 1} more` : '';
              const activeMonitorFilter = !!getParam(ANALYZER_FILTER);
              const ctaText = "Click to filter the list to this monitor's analysis";
              const usedText = firstMonitor ? firstName : deletedName;
              return (
                <TextWithActionButtonCell
                  width={320 - TEXT_CELLS_PADDING}
                  isUnhelpful={!!item.isFalseAlarm}
                  text={usedText}
                  actionButtonLabel="Apply filter"
                  actionButtonTooltip={ctaText}
                  actionHandler={
                    analyzerId && firstMonitor
                      ? () =>
                          handleNavigation({
                            page: 'monitorManager',
                            modelId,
                            monitorManager: { path: 'anomalies-feed' },
                            setParams: analyzerId ? [{ name: 'filterByAnalyzer', value: analyzerId }] : [],
                          })
                      : undefined
                  }
                  hideButton={activeMonitorFilter || !!pluralText}
                  unlinkedText={pluralText}
                />
              );
            }}
            width={320}
          />

          <Column
            header={
              <HeaderCell
                header="Segment"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalySegment} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const cellText =
                item.tags
                  .map((tag) => {
                    return `${tag.key}=${tag.value}`;
                  })
                  .join(', ') || '*';

              const tooltip = cellText === '*' ? 'Overall dataset' : cellText;
              return (
                <AnomalyDetailCell
                  width={240 - TEXT_CELLS_PADDING}
                  isUnhelpful={!!item.isFalseAlarm}
                  text={cellText}
                  showOverflowTooltip
                  tooltip={tooltip}
                />
              );
            }}
            width={240}
            flexGrow={1}
          />

          <Column
            header={
              <HeaderCell
                header="Severity"
                renderTooltip={() => <HtmlTooltip tooltipContent={tooltips.anomalySeverity} />}
              />
            }
            cell={({ rowIndex }) => {
              const item = data[rowIndex];
              const monitorIds = item.monitorIds ?? [];
              const severities: number[] = [];
              monitorIds.forEach((m) => {
                const monitor = monitorsById.get(m);
                if (monitor && monitor.severity !== undefined) {
                  severities.push(monitor.severity);
                }
              });
              severities.sort();

              const text = severities
                .map((s) => {
                  if (s === 1) {
                    return 'High';
                  }
                  if (s === 2) {
                    return 'Medium';
                  }
                  if (s === 3) {
                    return 'Low';
                  }
                  return undefined;
                })
                .filter((s) => !!s)
                .join(', ');

              return <AlertDetailsCell isUnhelpful={!!item.isFalseAlarm} text={text} showUnhelpfulChip={false} />;
            }}
            width={100}
            flexGrow={1}
          />
        </Table>
      )}
    </WhyLabsAutoSizer>
  );
}
