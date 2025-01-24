import useTypographyStyles from 'styles/Typography';
import { Cell } from 'fixed-data-table-2';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  countCell: {
    paddingTop: '10px',
  },
});

export interface CountCellProps {
  readonly count: number | null | undefined;
  readonly width: number;
}

export default function CountCell({ count, width }: CountCellProps): JSX.Element {
  const { classes: typography, cx } = useTypographyStyles();
  const { classes: styles } = useStyles();
  return (
    <Cell width={width} className={cx(typography.textTable, styles.countCell)}>
      {count?.toString() ?? ''}
    </Cell>
  );
}
