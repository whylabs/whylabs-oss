// Not sure why but eslint thinks that WhyLabsTableColumnProps props are unused
/* eslint-disable react/no-unused-prop-types */

import { TableProps, createStyles, getStylesRef } from '@mantine/core';
import { ReactElement, ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

export enum TableColumnHorizontalAlign {
  Left = 'left',
  Right = 'right',
}

export type RenderCellProps = {
  isSelected: boolean;
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
  uniqueKey: string;
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
  isLoading?: boolean;
  isRowSelected?: (rowIndex: number) => boolean;
  fixedHeader?: boolean;
  fixedFirstColumn?: boolean;
  footer?: ReactNode;
  withRowBorders?: boolean;
  withBottomBorder?: boolean;
  withHeaderBorders?: boolean;
} & Omit<TableProps, 'children' | 'verticalSpacing' | 'horizontalSpacing'>;

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
      withBottomBorder = true,
      withHeaderBorders = true,
      withRowBorders = true,
    }: Pick<
      WhyLabsTableProps,
      'fixedHeader' | 'headerHeight' | 'highlightOnHover' | 'withHeaderBorders' | 'withBottomBorder' | 'withRowBorders'
    >,
  ) => ({
    table: {
      borderBottom: withBottomBorder ? DEFAULT_BORDER : 'none',
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
    },
    header: {
      position: fixedHeader ? 'sticky' : 'unset',
      zIndex: 3,
      top: fixedHeader ? -1 : 'unset', // position stick doesn't work fine with border
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
