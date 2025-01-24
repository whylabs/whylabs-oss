import { Table, Skeleton } from '@mantine/core';
import { useMemo, useState } from 'react';
import { arrayOfLength } from 'utils/arrayUtils';
import {
  useTableStyles,
  WhyLabsTableProps,
  WhyLabsTableColumn,
  WhyLabsTableColumnProps,
  ColumnChild,
  RenderCellProps,
} from './tableUtils';

const WhyLabsTableContainer = ({
  children,
  afterTableChildren,
  className,
  rowsCount,
  headerHeight = 40,
  fixedHeader = true,
  highlightOnHover = true,
  fixedFirstColumn,
  isRowSelected,
  isLoading = false,
  withHeaderBorders = true,
  withRowBorders = false,
  ...rest
}: WhyLabsTableProps): JSX.Element => {
  const { classes, cx } = useTableStyles({
    fixedHeader,
    headerHeight,
    highlightOnHover,
    withHeaderBorders,
    withRowBorders,
  });
  const columns = (() => {
    const tempColumns = Array.isArray(children)
      ? (children.filter((c) => c) as React.ReactElement<WhyLabsTableColumnProps>[])
      : [children];
    return tempColumns.filter((c): c is ColumnChild => !!c);
  })();
  const [scrollTop, setScrollTop] = useState(0);
  const isStickyColumn = (index: number): string => {
    return index === 0 && fixedFirstColumn ? classes.stickyColumn : '';
  };

  const hasShadow = useMemo(() => {
    return scrollTop ? classes.shadow : classes.noShadow;
  }, [classes, scrollTop]);

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
        if (target.scrollTop > 5 && scrollTop === 0) {
          setScrollTop(target.scrollTop);
        }
        if (target.scrollTop < 5 && scrollTop > 0) {
          setScrollTop(0);
        }
      }}
    >
      <Table withBorder {...rest} className={cx(classes.table, className)} highlightOnHover={highlightOnHover}>
        <thead>
          <tr className={cx(classes.header, hasShadow)}>
            {columns.map(({ props }, i) => {
              const { header, minWidth, maxWidth, fixedWidth, uniqueKey } = props;
              const width = fixedWidth || maxWidth || 'auto';
              return (
                <th
                  key={`header--${uniqueKey}-${Math.random()}`}
                  style={{
                    minWidth: fixedWidth || minWidth,
                    maxWidth: fixedWidth || maxWidth,
                    width,
                  }}
                  className={cx(isStickyColumn(i), classes.headerCell)}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        {!!rowsCount && (
          <tbody>
            {arrayOfLength(rowsCount).map((rowIndex) => (
              <tr key={`row--${rowIndex}`}>
                {columns.map(({ props }, i) => {
                  const {
                    cell,
                    minWidth,
                    maxWidth,
                    fixedWidth,
                    uniqueKey,
                    horizontalAlign,
                    verticalAlign,
                    showOnHover,
                  } = props;
                  const width = fixedWidth || maxWidth || 'auto';
                  const isSelected = !!isRowSelected?.(rowIndex);
                  const cellProps: RenderCellProps = { isSelected };
                  return (
                    <td
                      align={horizontalAlign ?? 'left'}
                      className={cx(isStickyColumn(i), classes.dataCell, {
                        [classes.selectedCell]: isSelected,
                      })}
                      data-show-on-hover={showOnHover}
                      key={`cell--${uniqueKey}-${rowIndex}`}
                      style={{
                        minWidth: fixedWidth ?? minWidth,
                        maxWidth: fixedWidth ?? maxWidth,
                        width,
                        verticalAlign,
                      }}
                    >
                      {cell(rowIndex, cellProps)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        )}
      </Table>
    </div>
  );
};

export default {
  Container: WhyLabsTableContainer,
  Column: WhyLabsTableColumn,
};
