import { isValidNumber } from '~server/util/type-guards';
import { UIEvent } from 'react';

export const getScrollableElementClassName = (columnKey: string) => `${columnKey}-scrollable-div`;
export const getScrollableCellClassName = (columnKey: string) => `${columnKey}-scrollable-cell`;

export const handleTiedCellScroll = (ev: UIEvent<HTMLDivElement>, columnKey: string) => {
  const cellClass = getScrollableElementClassName(columnKey);
  const allColumnCells = document.querySelectorAll(`div.${cellClass}`);
  const event = ev.target as unknown as Record<string, unknown>;
  if ('scrollLeft' in event && isValidNumber(event.scrollLeft)) {
    const { scrollLeft } = event;
    allColumnCells?.forEach((columnCell) => {
      // eslint-disable-next-line no-param-reassign -- we want to change the other elements
      columnCell.scrollLeft = scrollLeft;
    });
  }
};

export const getWidestTiedCellScroll = (columnName: string) => {
  const widestCell: { width: number; id?: string } = { width: 0 };
  document.querySelectorAll(`div.${getScrollableCellClassName(columnName)}`)?.forEach((cell) => {
    if (isValidNumber(cell.scrollWidth) && cell.scrollWidth > widestCell.width) {
      widestCell.width = cell.scrollWidth ?? 0;
      widestCell.id = cell.id;
    }
  });
  return widestCell;
};
