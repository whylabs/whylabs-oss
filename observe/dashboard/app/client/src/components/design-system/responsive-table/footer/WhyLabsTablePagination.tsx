import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { usePagingInfo } from '~/hooks/usePagingInfo';
import { SetSearchParamsFn } from '~/hooks/useSearchAndHashParams';
import React from 'react';

import { getPaginationSizeOptions } from './paginationUtils';
import { WhyLabsTablePaginationActions } from './WhyLabsTablePaginationActions';

export const PAGINATION_ROOT_HEIGHT = 52;
const ROOT_BORDER_SIZE = 1;
const ROOT_HEIGHT_WITHOUT_BORDERS = 52 - 2 * ROOT_BORDER_SIZE;

const DEFAULT_BORDER = `${ROOT_BORDER_SIZE}px solid ${Colors.brandSecondary200}`;

type StyleProps = {
  withBorder?: boolean;
};

const useStyles = createStyles((_, { withBorder = true }: StyleProps) => ({
  root: {
    backgroundColor: Colors.whiteBackground,
    borderTop: withBorder ? DEFAULT_BORDER : 'none',
    borderBottom: withBorder ? DEFAULT_BORDER : 'none',
    bottom: 0,
    color: Colors.brandSecondary900,
    height: PAGINATION_ROOT_HEIGHT,
    position: 'sticky',
    width: '100%',
    flexShrink: 0,
  },
  contentWrapper: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 12px',
    width: '100%',
  },
  paginationControl: {
    '&[data-active]': {
      backgroundColor: `${Colors.brandPrimary900} !important`,
    },
  },
  tableRow: {
    display: 'table-row',
    overflow: 'hidden',
    verticalAlign: 'middle',

    '& td': {
      height: ROOT_HEIGHT_WITHOUT_BORDERS,
    },
  },
  paginationElementsWrapper: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    fontFamily: 'Asap,sans-serif',
    gap: 22,
    height: '100%',
    justifyContent: 'flex-end',

    '& p': {
      fontSize: 12,
      fontWeight: 300,
      margin: 0,
      lineHeight: '14px',
    },
  },
  rowsPerPageRoot: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
  },
  rowsPerPageSelect: {
    border: 0,
    borderRadius: 0,
    cursor: 'pointer',
    padding: 6,
    userSelect: 'none',
  },
}));

type WhyLabsTablePaginationProps = Omit<StyleProps, 'hasLeftChildren'> & {
  customSizeOptions?: number[];
  leftChildren?: React.ReactNode;
  loading?: boolean;
  rowCount: number;
  renderingOutsideTable?: boolean;
  customPaginationState?: {
    value: URLSearchParams;
    setter: SetSearchParamsFn;
  };
};

const WhyLabsTablePagination = ({
  customSizeOptions,
  leftChildren,
  loading,
  rowCount,
  withBorder,
  renderingOutsideTable,
  customPaginationState,
}: WhyLabsTablePaginationProps) => {
  const { classes, cx } = useStyles({ withBorder });
  const { page, pagingInfo, setPage, setPageSize } = usePagingInfo({ customPaginationState });

  const rowsPerPage = pagingInfo.limit;

  const pageOptions = getPaginationSizeOptions({ customSizeOptions, rowsPerPage });

  const renderPaginationElements = () => {
    if (loading) return null;
    return (
      <div className={classes.paginationElementsWrapper}>
        <div className={classes.rowsPerPageRoot}>
          <p>Rows per page: </p>
          <select
            aria-label="Select how many rows per page"
            className={classes.rowsPerPageSelect}
            onChange={handleChangeRowsPerPage}
            value={rowsPerPage}
          >
            {pageOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <p>{renderDisplayedRows()}</p>
        <WhyLabsTablePaginationActions count={rowCount} page={page} rowsPerPage={rowsPerPage} onChangePage={setPage} />
      </div>
    );
  };

  if (renderingOutsideTable)
    return (
      <div className={cx(classes.root, classes.contentWrapper)} data-testid="WhyLabsTablePagination">
        {!!leftChildren && <div>{leftChildren}</div>}
        {renderPaginationElements()}
      </div>
    );

  return (
    <tfoot className={classes.root} data-testid="WhyLabsTablePagination">
      <tr className={classes.tableRow}>
        <td className={classes.contentWrapper} colSpan={1000}>
          <div className={classes.contentWrapper}>
            {!!leftChildren && <div>{leftChildren}</div>}
            {renderPaginationElements()}
          </div>
        </td>
      </tr>
    </tfoot>
  );

  function handleChangeRowsPerPage({ target }: React.ChangeEvent<HTMLSelectElement>) {
    const newRowsPerPage = Number(target.value);
    setPageSize(newRowsPerPage);
  }

  function renderDisplayedRows() {
    const from = rowCount === 0 ? 0 : page * rowsPerPage + 1;
    const to = rowCount !== -1 ? Math.min(rowCount, (page + 1) * rowsPerPage) : (page + 1) * rowsPerPage;
    const count = rowCount === -1 ? -1 : rowCount;

    return `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`;
  }
};

export default WhyLabsTablePagination;
