import { Colors } from '@whylabs/observatory-lib';
import { useEffect } from 'react';
import { disabledBecauseAdHocText, useAdHocExists } from 'atoms/adHocAtom';
import { WhyLabsTooltip } from 'components/design-system';
import { WhyLabsTablePaginationActions } from 'components/design-system/responsive-table/footer/WhyLabsTablePaginationActions';
import { createStyles } from '@mantine/core';

const useStyles = createStyles(() => ({
  paginationContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: Colors.whiteBackground,
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    height: '52px',
    padding: '0 18px',
  },
  text: {
    fontSize: '12px',
    fontFamily: 'Asap, sans-serif',
  },
  notAllowed: {
    cursor: 'not-allowed',
  },
}));

export interface ISkinnyTableBottomPaginationProps {
  loading: boolean;
  page: number;
  onChangePage: (newPage: number) => void;
  rowCount: number;
  rowsPerPage: number;
}

export default function SkinnyTableBottomPagination({
  loading,
  page,
  onChangePage,
  rowCount,
  rowsPerPage,
}: ISkinnyTableBottomPaginationProps): JSX.Element {
  const { classes, cx } = useStyles();
  const controlsDisabled = useAdHocExists();

  const maxPage = Math.floor(rowCount / rowsPerPage);

  useEffect(() => {
    if (loading) return;

    if (page > maxPage) {
      onChangePage(0);
    }
  }, [loading, maxPage, onChangePage, page]);

  return (
    <div className={cx(classes.paginationContainer)}>
      {loading ? (
        <p className={classes.text}>Loading...</p>
      ) : (
        <WhyLabsTooltip position="top" label={controlsDisabled ? disabledBecauseAdHocText('pagination controls') : ''}>
          <div className={cx(controlsDisabled && classes.notAllowed)}>
            <WhyLabsTablePaginationActions
              count={rowCount}
              disabled={controlsDisabled}
              page={page}
              rowsPerPage={rowsPerPage}
              siblings={0}
              onChangePage={onChangePage}
            />
          </div>
        </WhyLabsTooltip>
      )}
    </div>
  );
}
