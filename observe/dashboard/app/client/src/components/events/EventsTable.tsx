import { timeLong } from '~/utils/dateUtils';
import { segmentTagsToString } from '~/utils/segments';
import { ReactNode, useState } from 'react';

import { WhyLabsDrawer, WhyLabsTableKit } from '../design-system';
import { TableColumnHorizontalAlign, WhyLabsTableColumnProps } from '../design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '../empty-state/SimpleEmptyStateMessage';
import { JsonViewer } from '../JsonViewer/JsonViewer';
import { EventJsonContentCell } from './EventJsonContentCell';
import { useEventsTableStyles } from './EventsTableStyles';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell },
  Footer: { SimplePagination },
} = WhyLabsTableKit;

export type EventTableObject = {
  content?: string;
  lastUploadTimestamp?: number;
  metricValue: number | null;
  profileTimestamp: number | null;
  segment:
    | {
        key: string;
        value: string;
      }[]
    | string;
  traceId: string | null;
};

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerText: string;
  isHidden?: boolean;
};

type EventsTableProps = {
  data: EventTableObject[];
  hasNextPage: boolean;
  isLoading: boolean;
  metricName?: string | null;
  resourceId: string;
};

export const EventsTable = ({ data: tableData, hasNextPage, isLoading, resourceId, metricName }: EventsTableProps) => {
  const { classes, cx } = useEventsTableStyles();

  const [selectedRowContent, setSelectedRowContent] = useState<object[]>([]);

  const hasData = !!tableData.length;
  const rowsCount = tableData.length;

  const shouldDisplayPagination = hasData && !isLoading;

  return (
    <>
      <WhyLabsTable.Container
        isLoading={isLoading}
        rowsCount={isLoading ? 0 : rowsCount}
        highlightOnHover={false}
        headerHeight={34}
        footer={shouldDisplayPagination && <SimplePagination hasNextPage={hasNextPage} />}
        afterTableChildren={
          !hasData &&
          !isLoading && (
            <SimpleEmptyStateMessage
              subtitle="Click to select data points and view profile metadata"
              title="No profile selected"
            />
          )
        }
      >
        {getColumns().map(({ headerText, columnKey, ...rest }) => (
          <WhyLabsTable.Column
            key={columnKey}
            columnKey={columnKey}
            header={
              <HeaderCell columnKey={columnKey} className={classes.header}>
                {headerText}
              </HeaderCell>
            }
            {...rest}
          />
        ))}
      </WhyLabsTable.Container>
      <WhyLabsDrawer
        isOpen={!!selectedRowContent.length}
        onClose={unselectRow}
        padding="lg"
        size="600px"
        uniqueId="events-drawer"
      >
        {renderSelectedRowContent()}
      </WhyLabsDrawer>
    </>
  );

  function getColumns(): TableColumn[] {
    const shouldDisplayLastUploadTimestamp = tableData.some((item) => !!item.lastUploadTimestamp);

    return [
      {
        columnKey: 'traceId',
        headerText: 'Trace ID',
        cell: renderTraceIdCell,
      },
      {
        columnKey: 'timestamp',
        headerText: 'Profile timestamp',
        cell: renderTimestampCell,
      },
      {
        isHidden: !shouldDisplayLastUploadTimestamp,
        columnKey: 'lastUploadTimestamp',
        headerText: 'Upload timestamp',
        cell: renderLastUploadTimestampCell,
      },
      {
        isHidden: !metricName,
        columnKey: 'metric',
        headerText: metricName ?? '',
        horizontalAlign: TableColumnHorizontalAlign.Right,
        cell: renderMetricCell,
      },
      {
        columnKey: 'segment',
        headerText: 'Segment',
        cell: renderSegmentsCell,
      },
      {
        columnKey: 'content',
        headerText: 'JSON content',
        maxWidth: '100%',
        cell: renderContentCell,
      },
    ].filter(({ isHidden }) => !isHidden);
  }

  function renderLastUploadTimestampCell(index: number) {
    const { lastUploadTimestamp } = tableData[index];
    return renderTextCell(lastUploadTimestamp ? timeLong(lastUploadTimestamp) : '-');
  }

  function renderTimestampCell(index: number) {
    const { profileTimestamp } = tableData[index];
    const content = profileTimestamp ? timeLong(profileTimestamp) : '-';
    return renderTextCell(content);
  }

  function renderTraceIdCell(index: number) {
    const { traceId } = tableData[index];
    return renderTextCell(traceId ?? '-');
  }

  function renderMetricCell(index: number) {
    const { metricValue } = tableData[index];
    return renderTextCell(metricValue ?? '-');
  }

  function renderSegmentsCell(index: number) {
    const { segment } = tableData[index];
    if (!segment) return renderTextCell('-');
    if (typeof segment === 'string') {
      return renderTextCell(segment);
    }
    return renderTextCell(segmentTagsToString(segment, '-'));
  }

  function renderTextCell(children: ReactNode) {
    return <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{children}</TextCell>;
  }

  function renderContentCell(index: number) {
    const { traceId } = tableData[index];
    if (!traceId) return renderTextCell('-');

    return (
      <div style={{ position: 'relative' }}>
        <EventJsonContentCell onSelectRowContent={onSelectRowContent} resourceId={resourceId} traceId={traceId} />
      </div>
    );
  }

  function renderSelectedRowContent() {
    if (!selectedRowContent.length) return null;

    return (
      <div className={classes.drawerContent}>
        {selectedRowContent.map((jsonObject, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <JsonViewer key={index} src={jsonObject} />
        ))}
      </div>
    );
  }

  function onSelectRowContent(content: object[]) {
    setSelectedRowContent(content);
  }

  function unselectRow() {
    setSelectedRowContent([]);
  }
};
