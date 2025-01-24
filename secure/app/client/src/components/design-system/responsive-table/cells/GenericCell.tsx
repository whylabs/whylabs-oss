import { createStyles } from '@mantine/core';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';

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

export interface GenericCellProps {
  readonly children: React.ReactNode;
  rootClassName?: string;
  tooltipText?: string;
  key?: string;
}
const GenericCell = ({ children, tooltipText, rootClassName, key }: GenericCellProps): JSX.Element => {
  const { classes, cx } = useStyles();

  return (
    <div className={cx(classes.wrapper, rootClassName)} key={key}>
      <WhyLabsTooltip label={tooltipText}>{children}</WhyLabsTooltip>
    </div>
  );
};

export default GenericCell;
