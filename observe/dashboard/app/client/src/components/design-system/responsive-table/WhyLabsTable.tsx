import { Skeleton, Table } from '@mantine/core';
import { arrayOfLength } from '~/utils/arrayUtils';
import { ReactElement, useMemo, useState } from 'react';

import {
  ColumnChild,
  RenderCellProps,
  WhyLabsTableColumn,
  WhyLabsTableColumnProps,
  WhyLabsTableProps,
  useTableStyles,
} from './tableUtils';

const WhyLabsTableContainer = ({
  children,
  afterTableChildren,
  className,
  rowsCount,
  headerHeight = 40,
  rowsHeight,
  fixedHeader = true,
  highlightOnHover = true,
  fixedFirstColumn,
  isRowSelected,
  isLoading = false,
  footer, // The footer might be better outside this component, to handle table's body scroll
  withHeaderBorders = true,
  withRowBorders = false,
  withBorder = true,
  ...rest
}: WhyLabsTableProps): JSX.Element => {
  const { classes, cx } = useTableStyles({
    fixedHeader,
    headerHeight,
    highlightOnHover,
    withHeaderBorders,
    withRowBorders,
    rowsHeight,
  });
  const columns = useMemo(() => {
    const tempColumns = Array.isArray(children)
      ? (children.filter((c) => c) as ReactElement<WhyLabsTableColumnProps>[])
      : [children];
    return tempColumns.filter((c): c is ColumnChild => !!c);
  }, [children]);
  const [scrollTop, setScrollTop] = useState(false);

  const renderHeaders = useMemo(() => {
    const hasShadow = scrollTop ? classes.shadow : classes.noShadow;
    return (
      <thead>
        <tr className={cx(classes.header, hasShadow)}>
          {columns.map(({ props }, i) => {
            const { header, minWidth, maxWidth, fixedWidth, columnKey } = props;
            const width = fixedWidth || maxWidth || 'auto';
            return (
              <th
                key={`header--${columnKey}`}
                style={{
                  minWidth: fixedWidth || minWidth,
                  maxWidth: fixedWidth || maxWidth,
                  width,
                }}
                className={cx(classes.headerCell, {
                  [classes.stickyColumn]: i === 0 && fixedFirstColumn,
                })}
              >
                {header}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  }, [
    classes.header,
    classes.headerCell,
    classes.noShadow,
    classes.shadow,
    classes.stickyColumn,
    columns,
    cx,
    fixedFirstColumn,
    scrollTop,
  ]);

  const renderRows = useMemo(() => {
    return (
      <tbody>
        {arrayOfLength(rowsCount).map((rowIndex) => (
          <tr key={`row--${rowIndex}`}>
            {columns.map(({ props }, i) => {
              const {
                cell,
                minWidth,
                maxWidth,
                fixedWidth,
                columnKey,
                horizontalAlign,
                verticalAlign,
                showOnHover,
                getCellBackgroundColor,
              } = props;
              const width = fixedWidth || maxWidth || 'auto';
              const isSelected = !!isRowSelected?.(rowIndex);
              const cellProps: RenderCellProps = { isSelected, columnKey };
              return (
                <td
                  align={horizontalAlign ?? 'left'}
                  className={cx(classes.dataCell, {
                    [classes.selectedCell]: isSelected,
                    [classes.stickyColumn]: i === 0 && fixedFirstColumn,
                  })}
                  data-show-on-hover={showOnHover}
                  key={`cell--${columnKey}-${rowIndex}`}
                  style={{
                    minWidth: fixedWidth ?? minWidth,
                    maxWidth: fixedWidth ?? maxWidth,
                    width,
                    verticalAlign,
                    backgroundColor: getCellBackgroundColor?.(rowIndex),
                  }}
                >
                  {cell(rowIndex, cellProps)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );
  }, [
    classes.dataCell,
    classes.selectedCell,
    classes.stickyColumn,
    columns,
    cx,
    fixedFirstColumn,
    isRowSelected,
    rowsCount,
  ]);

  if (isLoading) {
    return (
      <div className={classes.skeleton}>
        <Skeleton
          data-testid="WhyLabsTableLoadingSkeleton"
          height={headerHeight}
          key="table--skeleton-header"
          width="100%"
        />
        {arrayOfLength(8).map((i) => (
          <Skeleton height={40} key={`table--skeleton-row--${i}`} mt={2} width="100%" />
        ))}
      </div>
    );
  }
  return (
    <div
      data-testid="WhyLabsTable"
      className={classes.wrapper}
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop > 2 && !scrollTop) {
          setScrollTop(true);
        }
        if (target.scrollTop < 2 && scrollTop) {
          setScrollTop(false);
        }
      }}
    >
      <Table
        withColumnBorders
        withBorder={withBorder}
        {...rest}
        className={cx(classes.table, className)}
        highlightOnHover={highlightOnHover}
      >
        {renderHeaders}
        {!!rowsCount && renderRows}
        {footer}
      </Table>
      {afterTableChildren}
    </div>
  );
};

export default {
  Container: WhyLabsTableContainer,
  Column: WhyLabsTableColumn,
};
