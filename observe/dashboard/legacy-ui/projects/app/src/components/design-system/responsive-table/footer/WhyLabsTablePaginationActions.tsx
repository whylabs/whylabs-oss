import { Pagination, createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

type StyleProps = {
  hideDots?: boolean;
};

const useActionStyles = createStyles((_, { hideDots }: StyleProps) => ({
  dots: {
    display: hideDots ? 'none' : 'inherit',
  },
  control: {
    '&[data-active]': {
      backgroundColor: `${Colors.brandPrimary900} !important`,
    },
  },
}));

type WhyLabsTablePaginationActionsProps = {
  count: number;
  disabled?: boolean;
  hidePageButtons?: boolean;
  page: number;
  rowsPerPage: number;
  siblings?: number;
  onChangePage: (newPage: number) => void;
};

export const WhyLabsTablePaginationActions = ({
  count,
  disabled,
  hidePageButtons,
  page,
  rowsPerPage,
  siblings = 1,
  onChangePage,
}: WhyLabsTablePaginationActionsProps): JSX.Element => {
  const { classes } = useActionStyles({ hideDots: hidePageButtons });
  const totalPages = Math.ceil(count / rowsPerPage);

  const handleOnChangePage = (newValue: number) => {
    const newPage = newValue - 1;
    if (page !== newPage) {
      onChangePage(Math.min(Math.max(0, newPage), totalPages));
    }
  };

  const currentPage = page + 1;

  return (
    <Pagination
      classNames={classes}
      disabled={disabled}
      getControlProps={(control) => {
        if (control === 'next') return { 'aria-label': 'Next page' };

        if (control === 'previous') return { 'aria-label': 'Previous page' };

        return {};
      }}
      getItemProps={(p) => ({
        'aria-label': p === currentPage ? `Current page ${p}` : `Go to page ${p}`,
        style: { display: hidePageButtons ? 'none' : 'inherit' },
      })}
      onChange={handleOnChangePage}
      siblings={siblings}
      size="sm"
      total={totalPages}
      value={currentPage}
    />
  );
};
