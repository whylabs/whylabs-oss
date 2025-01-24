import { Typography, TableSortLabel } from '@material-ui/core';
import { Cell, CellProps } from 'fixed-data-table-2';
import React from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '../constants/colors';

export type SortType = 'natural' | 'ascending' | 'descending';

const useStyles = createStyles({
  stuffContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    whiteSpace: 'nowrap',
    alignItems: 'center',
    paddingLeft: 10,
  },
  stuffContainerFirstCol: {
    paddingLeft: 0,
  },
  noActive: {
    '&:hover': {
      color: Colors.black,
    },
    cursor: 'default',
  },
  bolded: {
    fontWeight: 600,
  },
  cellFont: {
    fontSize: '12px',
    lineHeight: '20px',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  cellBack: {
    backgroundColor: 'white',
  },
});

interface HeaderCellProps extends CellProps {
  header: string;
  renderTooltip: () => JSX.Element;
  isFirstColumn?: boolean;
  sortStatus?: SortType;
  sortToggle?: () => void;
}

export const HEADER_CELL_TEST_ID = 'header-cell-test-id';

export const HeaderCell: React.FC<HeaderCellProps> = ({
  header,
  width,
  height,
  renderTooltip,
  isFirstColumn,
  sortStatus,
  sortToggle,
}) => {
  const { classes: styles, cx } = useStyles();
  const handleClick =
    sortToggle ||
    (() => {
      /**/
    });

  return (
    <Cell width={width} height={height} className={styles.cellBack}>
      <div>
        <TableSortLabel
          active={sortStatus && sortStatus !== 'natural'}
          direction={sortStatus === 'ascending' ? 'asc' : 'desc'}
          hideSortIcon
          onClick={handleClick}
        >
          <div
            className={cx(
              styles.stuffContainer,
              !sortStatus && styles.noActive,
              isFirstColumn && styles.stuffContainerFirstCol,
            )}
          >
            <Typography data-testid={HEADER_CELL_TEST_ID} className={cx(styles.cellFont, styles.bolded)}>
              {header}
            </Typography>
            {renderTooltip()}
          </div>
        </TableSortLabel>
      </div>
    </Cell>
  );
};
