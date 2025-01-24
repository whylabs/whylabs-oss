import { Table, TableProps, createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { CSSProperties } from '@material-ui/core/styles/withStyles';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles(() => ({
  table: {
    '& thead': {
      backgroundColor: Colors.brandSecondary100,
    },
    '& thead tr': {
      height: 42,
    },
    '& thead tr th': {
      fontFamily: 'Asap',
      fontSize: 12,
    },
    '& tbody tr td': {
      fontFamily: 'Asap',
      fontSize: 12,
      fontWeight: 400,
    },
  },
  row: {},
  rowCell: {
    height: 42,
  },
}));

type TableColumn = {
  align?: CSSProperties['textAlign'];
  isHidden?: boolean;
  key: React.Key;
  label?: ReactNode;
  minWidth?: CSSProperties['minWidth'];
  width?: CSSProperties['width'];
};

export type WhyLabsTableProps = Pick<TableProps, 'highlightOnHover' | 'striped' | 'withColumnBorders'> & {
  className?: string;
  classNames?: {
    rowCell?: string;
  };
  children?: ReactNode;
  columns: TableColumn[];
};

const WhyLabsTable = ({ children, className, columns, ...rest }: WhyLabsTableProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  return (
    <Table className={cx(classes.table, className)} data-testid="WhyLabsTable" {...rest}>
      <thead>
        <tr>
          {columns
            .filter(({ isHidden }) => !isHidden)
            .map(({ align, key, label, ...styles }) => (
              <th key={key} style={{ textAlign: align, ...styles }}>
                {label}
              </th>
            ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </Table>
  );
};

type TableRowComponentProps = {
  children: ReactNode;
  className?: string;
};

const WhyLabsTableRow = ({ children, className }: TableRowComponentProps) => {
  const { classes, cx } = useStyles();
  return <tr className={cx(classes.row, className)}>{children}</tr>;
};

type TableCellComponentProps = {
  align?: CSSProperties['textAlign'];
  children: ReactNode;
  className?: string;
  colSpan?: number;
};

const WhyLabsTableCell = ({ align, children, className, ...rest }: TableCellComponentProps) => {
  const { classes, cx } = useStyles();

  return (
    <td
      className={cx(classes.rowCell, className)}
      {...rest}
      style={{
        textAlign: align,
      }}
    >
      {children}
    </td>
  );
};

WhyLabsTable.Row = WhyLabsTableRow;
WhyLabsTable.Cell = WhyLabsTableCell;

/**
 * @deprecated use WhyLabsTableKit from /components/design-system
 */
export default WhyLabsTable;
