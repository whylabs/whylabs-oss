// Not sure why but eslint thinks that WhyLabsTableColumnProps props are unused
/* eslint-disable react/no-unused-prop-types */

import { TableProps, createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactElement, ReactNode } from 'react';

export enum TableColumnHorizontalAlign {
  Left = 'left',
  Right = 'right',
}

export const TABLE_ACTIONS_GROUP_STYLE_REF = 'tableActionsGroup';

export type RenderCellProps = {
  isSelected: boolean;
  columnKey: string;
};

export type WhyLabsTableColumnProps = {
  cell: (rowIndex: number, props: RenderCellProps) => ReactElement;
  header: ReactElement;
  minWidth?: number | string;
  horizontalAlign?: TableColumnHorizontalAlign;
  verticalAlign?: 'top' | 'bottom' | 'middle';
  showOnHover?: boolean;
  maxWidth?: number | string;
  fixedWidth?: number | string;
  columnKey: string;
  getCellBackgroundColor?: (rowIndex: number) => string | undefined;
};

export const WhyLabsTableColumn = (props: WhyLabsTableColumnProps): ReactElement => {
  return <>{/* implementation not necessary */}</>;
};

export type ColumnChild = ReactElement<WhyLabsTableColumnProps>;
export type WhyLabsTableProps = {
  children: ColumnChild | Array<ColumnChild | false> | false;
  afterTableChildren?: ReactNode;
  rowsCount: number;
  headerHeight?: number;
  rowsHeight?: number;
  isLoading?: boolean;
  isRowSelected?: (rowIndex: number) => boolean;
  fixedHeader?: boolean;
  fixedFirstColumn?: boolean;
  /* footer is deprecated, should be outside the table component */
  footer?: ReactNode;
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
      rowsHeight,
      highlightOnHover,
      withHeaderBorders,
      withRowBorders,
    }: Pick<
      WhyLabsTableProps,
      'fixedHeader' | 'headerHeight' | 'rowsHeight' | 'highlightOnHover' | 'withHeaderBorders' | 'withRowBorders'
    >,
  ) => ({
    table: {
      borderBottom: DEFAULT_BORDER,
      borderTop: 'none', // adding the top border on the table wrapper to fix the border going away when we scroll with sticky header
      '&[data-hover] tbody tr:hover': {
        backgroundColor: highlightOnHover ? Colors.tealBackground : Colors.white,

        [`& .${getStylesRef('selectedCell')}`]: {
          backgroundColor: SELECTED_BACKGROUND_COLOR,
        },
        '& td, & th': {
          backgroundColor: highlightOnHover ? Colors.tealBackground : Colors.white,
          opacity: 1,

          [`& .${getStylesRef('selectedCell')}`]: {
            backgroundColor: SELECTED_BACKGROUND_COLOR,
          },
        },
        [`& .${getStylesRef(TABLE_ACTIONS_GROUP_STYLE_REF)}`]: {
          // make sure the table have the expected behavior with ActionsCell by default
          visibility: 'visible',
          display: 'flex',
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
      minHeight: rowsHeight || undefined,
      height: rowsHeight || 'min-content',
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
