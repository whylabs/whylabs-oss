import { createStyles, getStylesRef, TableProps } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { ReactElement, ReactNode } from 'react';

export enum TableColumnHorizontalAlign {
  Left = 'left',
  Right = 'right',
}

export type RenderCellProps = {
  isSelected: boolean;
};

export interface WhyLabsTableColumnProps {
  header: ReactElement;
  cell: (rowIndex: number, props: RenderCellProps) => ReactElement;
  minWidth?: number | string;
  horizontalAlign?: TableColumnHorizontalAlign;
  verticalAlign?: 'top' | 'bottom' | 'middle';
  showOnHover?: boolean;
  maxWidth?: number | string;
  fixedWidth?: number | string;
  uniqueKey: string;
}
export const WhyLabsTableColumn = (props: WhyLabsTableColumnProps): ReactElement => {
  return <>{/* implementation not necessary */}</>;
};

export type ColumnChild = ReactElement<WhyLabsTableColumnProps>;

export type WhyLabsTableProps = {
  children: ColumnChild | Array<ColumnChild | false> | false;
  afterTableChildren?: ReactNode;
  rowsCount: number;
  headerHeight?: number;
  isLoading?: boolean;
  isRowSelected?: (rowIndex: number) => boolean;
  fixedHeader?: boolean;
  fixedFirstColumn?: boolean;
  withRowBorders?: boolean;
  withHeaderBorders?: boolean;
} & Omit<TableProps, 'children' | 'verticalSpacing' | 'horizontalSpacing' | 'withColumnBorders'>;

const BORDER_COLOR = Colors.brandSecondary200;
const DEFAULT_BORDER = `1px solid ${BORDER_COLOR}`;

const SELECTED_BACKGROUND_COLOR = Colors.brandPrimary700;

export const useTableStyles = createStyles(
  (
    _,
    {
      fixedHeader,
      headerHeight,
      highlightOnHover,
      withHeaderBorders,
      withRowBorders,
    }: Pick<
      WhyLabsTableProps,
      'fixedHeader' | 'headerHeight' | 'highlightOnHover' | 'withHeaderBorders' | 'withRowBorders'
    >,
  ) => ({
    table: {
      borderBottom: DEFAULT_BORDER,
      borderTop: 'none', // adding the border top on the table header to fix the border going away when we scroll with sticky header
      '&[data-hover] tbody tr:hover': {
        backgroundColor: highlightOnHover ? Colors.tealBackground : 'white',

        [`& .${getStylesRef('selectedCell')}`]: {
          backgroundColor: SELECTED_BACKGROUND_COLOR,
        },
        '& td, & th': {
          backgroundColor: highlightOnHover ? Colors.tealBackground : 'white',
          opacity: 1,

          [`& .${getStylesRef('selectedCell')}`]: {
            backgroundColor: SELECTED_BACKGROUND_COLOR,
          },
        },
      },
      '& tbody>tr>td': {
        backgroundClip: 'padding-box',
        borderTop: withRowBorders ? DEFAULT_BORDER : 'none',
        borderRight: DEFAULT_BORDER,
      },
      '& thead>tr>th': {
        backgroundClip: 'padding-box',
        borderBottom: withHeaderBorders ? DEFAULT_BORDER : 'none',
        borderRight: DEFAULT_BORDER,
      },
      '& th': {
        backgroundColor: Colors.white,
        '&[data-show-on-hover="true"]': {
          opacity: 0,
        },
      },
    },
    headerCell: {
      minHeight: headerHeight,
      padding: '0 !important',
      height: headerHeight,
    },
    dataCell: {
      backgroundColor: Colors.white,
      height: 'min-content',
      padding: '0 10px !important',
    },
    selectedCell: {
      ref: getStylesRef('selectedCell'),
      backgroundColor: SELECTED_BACKGROUND_COLOR,
    },
    wrapper: {
      overflow: 'auto',
      width: '100%',
      borderTop: DEFAULT_BORDER,
    },
    header: {
      position: fixedHeader ? 'sticky' : 'unset',
      zIndex: 3,
      top: fixedHeader ? 0 : 'unset',
      minHeight: headerHeight,
      height: headerHeight,
    },
    bodyWrapper: {
      marginTop: fixedHeader ? headerHeight : 0,
      boxShadow: '8px 4px 8px rgba(0, 0, 0, 0.15)',
    },
    shadow: {
      boxShadow: `8px 4px 8px rgba(0, 0, 0, 0.1), inset 0px 1px 0 ${BORDER_COLOR}`,
      transition: 'box-shadow 0.1s ease-in',
    },
    noShadow: {
      boxShadow: 'unset',
      transition: 'box-shadow 0.1s ease-out',
    },
    stickyColumn: {
      position: 'sticky',
      left: 0,
      zIndex: 2,
      borderRight: 'unset !important',
      boxShadow: `inset -1px 0px 0 ${BORDER_COLOR}`,
    },
    skeleton: {
      width: '100%',
    },
  }),
);
