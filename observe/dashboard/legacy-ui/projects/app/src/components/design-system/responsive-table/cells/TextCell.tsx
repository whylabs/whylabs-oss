import WhyLabsTooltip from 'components/design-system/tooltip/WhyLabsTooltip';
import { createStyles } from '@mantine/core';
import { useResizeObserver } from '@mantine/hooks';
import { useRef } from 'react';

const useStyles = createStyles(() => ({
  textCell: {
    color: 'black',
    fontFamily: 'Inconsolata',
    fontSize: '13px',
    lineHeight: 1.4,
    fontWeight: 400,
    display: 'block',
    padding: '0 8px',
    whiteSpace: 'pre-wrap',
  },
  wrapper: {
    overflow: 'hidden',
    maxHeight: 'inherit',
    whiteSpace: 'pre-wrap',
    textOverflow: 'ellipsis',
  },
}));

export interface TextCellProps {
  readonly children: React.ReactNode;
  tooltipText?: string;
  className?: string;
}
const TABLE_CELL_PADDING = 20;
const TextCell = ({ children, className = '', tooltipText = '' }: TextCellProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const [ref, rect] = useResizeObserver();
  const textRef = useRef<HTMLSpanElement>(null);
  const tooltip = rect.width + TABLE_CELL_PADDING < (textRef?.current?.offsetWidth ?? 0) ? children : tooltipText;
  return (
    <div ref={ref} className={classes.wrapper}>
      <WhyLabsTooltip label={tooltip}>
        <span ref={textRef} className={cx(classes.textCell, className)}>
          {children}
        </span>
      </WhyLabsTooltip>
    </div>
  );
};

export default TextCell;
