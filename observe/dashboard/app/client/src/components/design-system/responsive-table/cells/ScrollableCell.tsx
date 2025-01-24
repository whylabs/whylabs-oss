import { createStyles } from '@mantine/core';
import {
  getScrollableCellClassName,
  getScrollableElementClassName,
  getWidestTiedCellScroll,
  handleTiedCellScroll,
} from '~/components/design-system/responsive-table/cells/utils';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { useMount } from '~/hooks/useMount';
import { ReactElement, ReactNode, useState } from 'react';

const useStyles = createStyles({
  wrapper: {
    overflow: 'auto',
    maxHeight: 'inherit',
    height: 'inherit',
    scrollbarWidth: 'none',
    width: '100%',
  },
});

export interface ScrollableCellProps {
  readonly children: ReactNode;
  rootClassName?: string;
  tooltipText?: string;
  columnKey: string;
}
const ScrollableCell = ({ children, tooltipText, rootClassName, columnKey }: ScrollableCellProps): ReactElement => {
  const cellClass = getScrollableCellClassName(columnKey);
  const scrollElementClass = getScrollableElementClassName(columnKey);
  const { width } = getWidestTiedCellScroll(columnKey);
  const { classes, cx } = useStyles();
  const [cellId, setCellId] = useState<string>();

  useMount(() => {
    // we must let the cells render the first time to make sure those will use all the width it needs,
    // then we update this state to trigger re-render and get the widest width.
    setCellId(columnKey + (Math.random() + Date.now()).toString());
  });

  return (
    <div
      id={cellId}
      className={cx(classes.wrapper, rootClassName, cellClass, scrollElementClass)}
      onScroll={(ev) => handleTiedCellScroll(ev, columnKey)}
    >
      {/* we need this wrapper div to avoid the overflow property to propagate to the tooltip */}
      <div style={{ width: !width ? '100%' : width }}>
        <WhyLabsTooltip label={tooltipText}>{children}</WhyLabsTooltip>
      </div>
    </div>
  );
};

export default ScrollableCell;
