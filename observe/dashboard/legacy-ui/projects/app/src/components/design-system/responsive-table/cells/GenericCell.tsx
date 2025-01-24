import WhyLabsTooltip from 'components/design-system/tooltip/WhyLabsTooltip';
import { createStyles } from '@mantine/core';
import { GenericCellProps } from './types';

const useStyles = createStyles(() => ({
  wrapper: {
    overflow: 'hidden',
    maxHeight: 'inherit',
    height: 'inherit',
    padding: '0 8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
}));

const GenericCell = ({ children, tooltipText, className }: GenericCellProps): JSX.Element => {
  const { classes, cx } = useStyles();

  return (
    <div className={cx(classes.wrapper, className)}>
      <WhyLabsTooltip label={tooltipText}>{children}</WhyLabsTooltip>
    </div>
  );
};

export default GenericCell;
