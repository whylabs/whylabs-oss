import { createStyles } from '@mantine/core';
import React from 'react';
import { Colors } from '~/assets/Colors';
import { usePagingInfo } from '~/hooks/usePagingInfo';

import { getPaginationSizeOptions } from './paginationUtils';
import { WhyLabsTablePaginationActions } from './WhyLabsTablePaginationActions';

const ROOT_HEIGHT = 52;
const ROOT_BORDER_SIZE = 1;
const ROOT_HEIGHT_WITHOUT_BORDERS = 52 - 2 * ROOT_BORDER_SIZE;

const DEFAULT_BORDER = `${ROOT_BORDER_SIZE}px solid ${Colors.brandSecondary300}`;

type StyleProps = {
  withBorder?: boolean;
};

const useStyles = createStyles((_, { withBorder = true }: StyleProps) => ({
  root: {
    backgroundColor: Colors.whiteBackground,
    bottom: 0,
    color: Colors.brandSecondary900,
    height: ROOT_HEIGHT,
    position: 'sticky',
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
  tableRowRoot: {
    alignItems: 'center',
    borderTop: withBorder ? DEFAULT_BORDER : 'none',
    borderBottom: withBorder ? DEFAULT_BORDER : 'none',
    display: 'flex',
    fontFamily: 'Asap,sans-serif',
    gap: 22,
    height: '100%',
    justifyContent: 'flex-end',
    padding: '0 12px',

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

type WhyLabsTableSimplePaginationProps = StyleProps & {
  customSizeOptions?: number[];
  hasNextPage?: boolean;
  loading?: boolean;
};

const WhyLabsTableSimplePagination = ({
  customSizeOptions,
  hasNextPage,
  loading,
  withBorder,
}: WhyLabsTableSimplePaginationProps) => {
  const { classes } = useStyles({ withBorder });
  const { page, pagingInfo, setPage, setPageSize } = usePagingInfo();

  const rowsPerPage = pagingInfo.limit;
  const pageToDisplay = page + 1;

  const pageOptions = getPaginationSizeOptions({ customSizeOptions, rowsPerPage });

  return (
    <tfoot className={classes.root} data-testid="WhyLabsTableSimplePagination">
      <tr className={classes.tableRow}>
        {!loading && (
          <td colSpan={1000}>
            <div className={classes.tableRowRoot}>
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
              <p>Page {pageToDisplay}</p>

              <WhyLabsTablePaginationActions
                count={getCount()}
                hidePageButtons
                page={page}
                rowsPerPage={rowsPerPage}
                onChangePage={setPage}
              />
            </div>
          </td>
        )}
      </tr>
    </tfoot>
  );

  function getCount() {
    const countUpToCurrentPage = rowsPerPage * pageToDisplay;
    if (!hasNextPage) return countUpToCurrentPage;

    return countUpToCurrentPage + 1;
  }

  function handleChangeRowsPerPage({ target }: React.ChangeEvent<HTMLSelectElement>) {
    const newRowsPerPage = Number(target.value);
    setPageSize(newRowsPerPage);
  }
};

export default WhyLabsTableSimplePagination;
