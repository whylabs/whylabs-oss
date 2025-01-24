import { useEffect, useState } from 'react';
import { clone } from 'ramda';
import { WhyLabsTableKit } from 'components/design-system';
import { TableColumnHorizontalAlign } from 'components/design-system/responsive-table/tableUtils';
import { friendlyFormat } from 'utils/numberUtils';
import { SortDirectionType } from 'hooks/useSort/types';
import { HistogramRow, ProfileNameAndColor } from './tableTypes';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';
import { ProfileHeaderCell } from './ProfileHeaderCell';
import { SORTABLE_COLUMN_MIN_WIDTH, sortRows, TableSortTarget } from './tableTools';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, SortableGenericCell, SortableHeaderCell },
} = WhyLabsTableKit;

interface ProfilesHistogramTableProps {
  profileColumns: ProfileNameAndColor[];
  rows: HistogramRow[];
  hasValidRows: boolean;
}

export function ProfilesHistogramTable({
  profileColumns,
  rows,
  hasValidRows,
}: ProfilesHistogramTableProps): JSX.Element | null {
  const { classes } = useProfileFeaturePanelStyles();
  const [dataValidated, setDataValidated] = useState<boolean>(hasValidRows);
  const [sortedRows, setSortedRows] = useState<HistogramRow[]>(clone(rows));
  const [sortTarget, setSortTarget] = useState<TableSortTarget>('unknown');
  const [sortDirection, setSortDirection] = useState<SortDirectionType>(undefined);

  // Need to ensure that the sorted row data is valid at least once before rendering
  useEffect(() => {
    if (rows.length > 0 && hasValidRows && !dataValidated) {
      setDataValidated(true);
      setSortedRows(clone(rows));
    }
  }, [rows, hasValidRows, dataValidated]);

  const sortTable = (updatedSortDirection: SortDirectionType, target: TableSortTarget) => {
    setSortTarget(target);
    setSortDirection(updatedSortDirection);
    if (target === 'unknown' || updatedSortDirection === undefined) {
      setSortedRows(rows);
    }
    const indexFunction = (row: HistogramRow) => row.bin;
    const updatedSortedRows = sortRows(rows, indexFunction, target, updatedSortDirection);
    setSortedRows(updatedSortedRows);
  };

  if (sortedRows.length === 0) {
    return null;
  }
  return (
    <WhyLabsTable.Container rowsCount={sortedRows.length} headerHeight={42}>
      <WhyLabsTable.Column
        uniqueKey="bin"
        header={
          <SortableHeaderCell
            sortType="number"
            sortDirection={sortTarget === 'index' ? sortDirection : undefined}
            className={classes.headerCellStyle}
            onSortDirectionChange={(updatedSortDirection) => {
              sortTable(updatedSortDirection, 'index');
            }}
          >
            Bin
          </SortableHeaderCell>
        }
        horizontalAlign={TableColumnHorizontalAlign.Left}
        cell={(rowIndex) => {
          const row = sortedRows[rowIndex] as HistogramRow;
          return <TextCell className={classes.bodyCellStyle}>{row.bin}</TextCell>;
        }}
      />
      <WhyLabsTable.Column
        uniqueKey="lowerEdge"
        header={<HeaderCell className={classes.headerCellStyle}>Lower edge</HeaderCell>}
        horizontalAlign={TableColumnHorizontalAlign.Right}
        cell={(rowIndex) => {
          const row = sortedRows[rowIndex] as HistogramRow;
          return <TextCell className={classes.bodyCellStyle}>{friendlyFormat(row.lowerEdge, 3)}</TextCell>;
        }}
      />
      <WhyLabsTable.Column
        uniqueKey="upperEdge"
        header={<HeaderCell className={classes.headerCellStyle}>Upper edge</HeaderCell>}
        horizontalAlign={TableColumnHorizontalAlign.Right}
        cell={(rowIndex) => {
          const row = sortedRows[rowIndex] as HistogramRow;
          return <TextCell className={classes.bodyCellStyle}>{friendlyFormat(row.upperEdge, 3)}</TextCell>;
        }}
      />
      {profileColumns.length > 0 && (
        <WhyLabsTable.Column
          uniqueKey={profileColumns[0].name}
          minWidth={SORTABLE_COLUMN_MIN_WIDTH}
          horizontalAlign={TableColumnHorizontalAlign.Right}
          header={
            <SortableGenericCell
              sortType="number"
              sortDirection={sortTarget === 'profile1' ? sortDirection : undefined}
              onSortDirectionChange={(updatedSortDirection) => {
                sortTable(updatedSortDirection, 'profile1');
              }}
              className={classes.sortableProfileHeader}
            >
              <ProfileHeaderCell name={profileColumns[0].name} color={profileColumns[0].color} />
            </SortableGenericCell>
          }
          cell={(rowIndex) => {
            return (
              <TextCell className={classes.bodyCellStyle}>
                {friendlyFormat(sortedRows[rowIndex].profileCounts[0], 0) ?? ''}
              </TextCell>
            );
          }}
        />
      )}
      {profileColumns.length > 1 && (
        <WhyLabsTable.Column
          uniqueKey={profileColumns[1].name}
          minWidth={SORTABLE_COLUMN_MIN_WIDTH}
          horizontalAlign={TableColumnHorizontalAlign.Right}
          header={
            <SortableGenericCell
              sortType="number"
              sortDirection={sortTarget === 'profile2' ? sortDirection : undefined}
              onSortDirectionChange={(updatedSortDirection) => {
                sortTable(updatedSortDirection, 'profile2');
              }}
              className={classes.sortableProfileHeader}
            >
              <ProfileHeaderCell name={profileColumns[1].name} color={profileColumns[1].color} />
            </SortableGenericCell>
          }
          cell={(rowIndex) => {
            return (
              <TextCell className={classes.bodyCellStyle}>
                {friendlyFormat(sortedRows[rowIndex].profileCounts[1], 0) ?? ''}
              </TextCell>
            );
          }}
        />
      )}
      {profileColumns.length > 2 && (
        <WhyLabsTable.Column
          uniqueKey={profileColumns[2].name}
          minWidth={SORTABLE_COLUMN_MIN_WIDTH}
          horizontalAlign={TableColumnHorizontalAlign.Right}
          header={
            <SortableGenericCell
              sortType="number"
              sortDirection={sortTarget === 'profile3' ? sortDirection : undefined}
              onSortDirectionChange={(updatedSortDirection) => {
                sortTable(updatedSortDirection, 'profile3');
              }}
              className={classes.sortableProfileHeader}
            >
              <ProfileHeaderCell name={profileColumns[2].name} color={profileColumns[2].color} />
            </SortableGenericCell>
          }
          cell={(rowIndex) => {
            return (
              <TextCell className={classes.bodyCellStyle}>
                {friendlyFormat(sortedRows[rowIndex].profileCounts[2], 0) ?? ''}
              </TextCell>
            );
          }}
        />
      )}
    </WhyLabsTable.Container>
  );
}
