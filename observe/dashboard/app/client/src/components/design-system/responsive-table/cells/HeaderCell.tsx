import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { getWidestTiedCellScroll, handleTiedCellScroll } from '~/components/design-system/responsive-table/cells/utils';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { useEffect, useState } from 'react';

export type HeaderCellStyleProps = {
  hasTooltip: boolean;
  textAlign: 'left' | 'right';
};

export const HEADER_CELL_HORIZONTAL_PADDING = 18;

const useStyles = createStyles((_, { hasTooltip, textAlign }: HeaderCellStyleProps) => ({
  flexWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  root: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    padding: `0 ${HEADER_CELL_HORIZONTAL_PADDING}px`,
    height: '100%',
  },
  headerCell: {
    position: 'relative',
    color: Colors.black,
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: 1.4,
    fontWeight: 600,
    whiteSpace: 'pre-wrap',
    minWidth: 'inherit',
    display: 'block',
    textOverflow: 'ellipsis',
    textAlign,
    overflow: 'hidden',
    paddingRight: hasTooltip ? 8 : 0,
  },
  questionMark: {
    color: Colors.brandPrimary900,
    position: 'absolute',
    right: 0,
    top: -4,
    fontSize: '0.8rem',
    marginLeft: 6,
    pointer: 'cursor',
  },
  scrollableDiv: {
    width: '100%',
    overflowX: 'scroll',
    height: 8,
    '::-webkit-scrollbar': {
      WebkitAppearance: 'none',
      height: 7,
      borderTop: `1px solid #E8E8E8`,
      backgroundColor: '#FAFAFA',
    },
    '::-webkit-scrollbar-thumb': {
      borderRadius: 4,
      backgroundColor: 'rgba(0, 0, 0, .2)',
      WebkitBoxShadow: '0 0 1px rgba(255,255,255,.5)',
    },
    '::-webkit-scrollbar-thumb:hover': {
      backgroundColor: 'rgba(0, 0, 0, .5)',
    },
  },
  scrollBuffer: {
    paddingTop: 6,
    paddingBottom: 2,
  },
}));

export const SCROLL_PADDING_BUFFER = 20;

export interface HeaderCellProps {
  readonly children: string;
  align?: HeaderCellStyleProps['textAlign'];
  tooltipText?: string;
  className?: string;
  scrollableFixedWidth?: number;
  columnKey: string;
  widthBuffer?: number;
}
const HeaderCell = ({
  children,
  align = 'left',
  className = '',
  tooltipText,
  scrollableFixedWidth,
  columnKey,
  widthBuffer = 0,
}: HeaderCellProps): JSX.Element => {
  const hasTooltip = !!tooltipText;

  const { classes, cx } = useStyles({
    hasTooltip,
    textAlign: align,
  });
  const widestCell = scrollableFixedWidth ? getWidestTiedCellScroll(columnKey) : undefined;
  const minScrollableWidth =
    scrollableFixedWidth && widestCell?.id ? widestCell.width + SCROLL_PADDING_BUFFER + widthBuffer : 0;
  const displayScrollBar = scrollableFixedWidth && Math.ceil(scrollableFixedWidth) < minScrollableWidth;
  const [headerId, setHeaderId] = useState<string>();

  useEffect(() => {
    // we must let the cells render the first time to make sure those will use all the width it needs,
    // then we update this state to trigger re-render and get the widest width.
    if (scrollableFixedWidth) {
      setHeaderId(columnKey + (Math.random() + Date.now()).toString());
    }
  }, [columnKey, scrollableFixedWidth, widestCell?.id]);

  const element = (
    <span
      key={`header-${children}`}
      className={cx(classes.headerCell, className, { [classes.scrollBuffer]: !!displayScrollBar })}
    >
      <WhyLabsTooltip label={tooltipText} openDelay={300}>
        {children}
        {hasTooltip && <span className={classes.questionMark}>?</span>}
      </WhyLabsTooltip>
    </span>
  );

  return (
    <div className={classes.flexWrapper} id={headerId}>
      <div className={classes.root} data-testid="WhyLabsHeaderCell">
        {element}
      </div>
      {displayScrollBar && (
        <div className={cx(classes.scrollableDiv)} onScroll={(ev) => handleTiedCellScroll(ev, columnKey)}>
          <div style={{ width: minScrollableWidth }} className={`${columnKey}-header-scroll`} />
        </div>
      )}
    </div>
  );
};

export default HeaderCell;
