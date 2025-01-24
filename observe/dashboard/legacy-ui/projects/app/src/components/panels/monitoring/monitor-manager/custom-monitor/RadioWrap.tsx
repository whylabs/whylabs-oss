import { WhyLabsTooltip } from 'components/design-system';
import { createStyles } from '@mantine/core';

const useStyles = createStyles(() => ({
  root: {
    paddingBottom: '8px',
  },
}));
const RadioWrap = ({
  children,
  disabled,
  tooltip,
}: {
  children: JSX.Element;
  disabled: boolean;
  tooltip?: string;
}): JSX.Element => {
  const { classes } = useStyles();
  const tooltipLabel = disabled ? tooltip : '';
  return (
    <div className={classes.root}>
      <WhyLabsTooltip label={tooltipLabel}>{children}</WhyLabsTooltip>
    </div>
  );
};
export default RadioWrap;
