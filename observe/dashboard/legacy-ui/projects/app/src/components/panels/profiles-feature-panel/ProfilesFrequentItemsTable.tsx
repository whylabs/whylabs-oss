import { WhyLabsTableKit } from 'components/design-system';
import { TableColumnHorizontalAlign } from 'components/design-system/responsive-table/tableUtils';
import { friendlyFormat } from 'utils/numberUtils';
import { useCallback, useEffect, useState } from 'react';
import { SortDirectionType } from 'hooks/useSort/types';
import { clone } from 'ramda';
import { ProfileHeaderCell } from './ProfileHeaderCell';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';
import { FrequentItemsRow, ProfileNameAndColor } from './tableTypes';
import { countValidColumns, SORTABLE_COLUMN_MIN_WIDTH, sortRows, TableSortTarget } from './tableTools';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, SortableGenericCell, SortableHeaderCell },
} = WhyLabsTableKit;

interface ProfilesFrequentItemsTableProps {
  profileColumns: ProfileNameAndColor[];
  rows: FrequentItemsRow[];
}

export function ProfilesFrequentItemsTable({
  profileColumns,
  rows,
}: ProfilesFrequentItemsTableProps): JSX.Element | null {
  const { classes } = useProfileFeaturePanelStyles();
  const [sortedRows, setSortedRows] = useState<FrequentItemsRow[]>(clone(rows));
  const [validColumnCount, setValidColumnCount] = useState<number>(0);
  const [sortDirection, setSortDirection] = useState<SortDirectionType>(undefined);
  const [sortTarget, setSortTarget] = useState<TableSortTarget>('unknown');

  useEffect(() => {
    if (validColumnCount > 0 || rows.length === 0) {
      return;
    }
    setValidColumnCount(countValidColumns(rows, profileColumns.length));
  }, [rows, validColumnCount, profileColumns.length]);

  useEffect(() => {
    if (sortedRows.length === 0 && validColumnCount > 0) {
      setSortedRows(clone(rows));
    }
  }, [rows, sortedRows.length, validColumnCount]);

  const sortTable = useCallback(
    (updatedSortDirecton: SortDirectionType, target: TableSortTarget) => {
      setSortTarget(target);
      setSortDirection(updatedSortDirecton);
      if (target === 'unknown' || updatedSortDirecton === undefined) {
        setSortedRows(rows);
      }
      const indexFunction = (row: FrequentItemsRow) => {
        return row.item;
      };
      const updatedSortedRows = sortRows(rows, indexFunction, target, updatedSortDirecton);
      setSortedRows(updatedSortedRows);
    },
    [rows],
  );
  if (rows.length === 0) {
    return null;
  }

  return (
    <WhyLabsTable.Container rowsCount={sortedRows.length} headerHeight={42}>
      <WhyLabsTable.Column
        uniqueKey="item-list"
        header={
          <SortableHeaderCell
            sortType="text"
            sortDirection={sortTarget === 'index' ? sortDirection : undefined}
            className={classes.headerCellStyle}
            onSortDirectionChange={(updatedSortDirection) => {
              sortTable(updatedSortDirection, 'index');
            }}
          >
            Item
          </SortableHeaderCell>
        }
        horizontalAlign={TableColumnHorizontalAlign.Left}
        cell={(rowIndex) => {
          const row = sortedRows[rowIndex];
          return <TextCell className={classes.bodyCellStyle}>{row.item}</TextCell>;
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
