import { TableSortLabel } from '@material-ui/core';
import { Cell, CellProps } from 'fixed-data-table-2';
import { Colors } from '@whylabs/observatory-lib';
import { SortDirection } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { SortDirectionType } from 'hooks/useSort/types';
import { createStyles, getStylesRef } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';

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
    paddingLeft: 10,
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
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: '20px',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  sortingWrap: {
    ref: getStylesRef('sortingWrap'),
    opacity: 0,
    transition: 'opacity 200ms',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellBack: {
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'background 200ms',
    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
      [`& .${getStylesRef('sortingWrap')}`]: {
        opacity: 1,
      },
    },
  },
  cellSortActive: {
    [`& .${getStylesRef('sortingWrap')}`]: {
      opacity: 1,
    },
  },
  cellContentWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectSortBase: {
    '&::before': { display: 'none' },
    '&::after': { display: 'none' },
    '& select': {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 4,
      fontSize: 12,
      height: 20,
    },
  },
  multiSortLabel: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  disabledStyles: {
    cursor: 'not-allowed',
  },
});

interface HeaderCellSortSelectProps extends CellProps {
  header: string;
  sortDirection: SortDirectionType;
  onSortDirectionChange: (sortDirection: SortDirectionType) => void;
  isFirstColumn?: boolean;
  renderTooltip?: () => JSX.Element;
}

export const HEADER_SORT_CELL_TEST_ID = 'header-sort-cell-test-id';

function HeaderCellSortSelect({
  header,
  width,
  height,
  renderTooltip,
  isFirstColumn,
  sortDirection,
  onSortDirectionChange,
}: HeaderCellSortSelectProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  function getNextSortDirectionState() {
    return changeInCircle();
  }

  /**
   * Desc -> Asc -> undefined -> Desc
   */
  function changeInCircle() {
    switch (sortDirection) {
      case undefined:
        return SortDirection.Desc;
      case SortDirection.Desc:
        return SortDirection.Asc;
      case SortDirection.Asc:
        return undefined;
      default:
        return undefined;
    }
  }

  return (
    <Cell
      width={width}
      height={height}
      className={cx(styles.cellBack, sortDirection && styles.cellSortActive)}
      onClick={() => {
        const newSortDirection = getNextSortDirectionState();
        onSortDirectionChange(newSortDirection);
      }}
    >
      <div className={styles.cellContentWrap}>
        <TableSortLabel active={false} hideSortIcon>
          <div
            className={cx(
              styles.stuffContainer,
              !sortDirection && styles.noActive,
              isFirstColumn && styles.stuffContainerFirstCol,
            )}
          >
            <WhyLabsText inherit data-testid={HEADER_SORT_CELL_TEST_ID} className={cx(styles.cellFont, styles.bolded)}>
              {header}
            </WhyLabsText>
            {renderTooltip && renderTooltip()}
          </div>
        </TableSortLabel>
        {sortDirection ? (
          <TableSortLabel
            className={styles.multiSortLabel}
            active={!!sortDirection}
            direction={sortDirection === SortDirection.Asc ? 'asc' : 'desc'}
          />
        ) : (
          <span className={cx(styles.sortingWrap, typography.textThin)}>Click to sort</span>
        )}
      </div>
    </Cell>
  );
}

export default HeaderCellSortSelect;
