import WhyLabsTooltip from 'components/design-system/tooltip/WhyLabsTooltip';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { GenericCellProps } from './types';

export type HeaderCellStyleProps = {
  hasTooltip: boolean;
  textAlign: 'left' | 'right';
};

export const HEADER_CELL_HORIZONTAL_PADDING = 18;

export const useStyles = createStyles((_, { hasTooltip, textAlign }: HeaderCellStyleProps) => ({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    padding: `0 ${HEADER_CELL_HORIZONTAL_PADDING}px`,
  },
  headerCell: {
    color: Colors.black,
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: 1.4,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    minWidth: 'inherit',
    display: 'block',
    textOverflow: 'ellipsis',
    textAlign,
    overflow: 'hidden',

    '&:after': {
      color: Colors.brandPrimary900,
      content: '"?"',
      display: hasTooltip ? 'inline-block' : 'none',
      fontSize: '0.8rem',
      marginLeft: 6,
      pointer: 'cursor',
    },
  },
}));

export interface HeaderCellProps extends GenericCellProps {
  align?: HeaderCellStyleProps['textAlign'];
}

const HeaderCell = ({ children, align = 'left', className = '', tooltipText }: HeaderCellProps): JSX.Element => {
  const hasTooltip = !!tooltipText;

  const { classes, cx } = useStyles({
    hasTooltip,
    textAlign: align,
  });

  const element = (
    <span key={`header-${children}`} className={cx(classes.headerCell, className)}>
      {children}
    </span>
  );

  return (
    <div className={classes.root} data-testid="WhyLabsHeaderCell">
      {hasTooltip ? <WhyLabsTooltip label={tooltipText}>{element}</WhyLabsTooltip> : element}
    </div>
  );
};

export default HeaderCell;
