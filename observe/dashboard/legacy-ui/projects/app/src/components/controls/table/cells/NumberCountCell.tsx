import useTypographyStyles from 'styles/Typography';
import { Cell } from 'fixed-data-table-2';
import { ReactNode } from 'react';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  cellBodyRight: {
    position: 'absolute',
    right: 0,
  },
  cellBody: {
    maxHeight: 40,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '10px !important',
  },
});

interface NumberCountCellProps {
  readonly children: number | string | ReactNode;
  readonly color?: string;
}

export function NumberCountCell({ children, color }: NumberCountCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  return (
    <Cell className={cx(styles.cellBody, styles.cellBodyRight)}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <p className={typography.monoFont} style={{ color }}>
          {children}
        </p>
      ) : (
        children
      )}
    </Cell>
  );
}
