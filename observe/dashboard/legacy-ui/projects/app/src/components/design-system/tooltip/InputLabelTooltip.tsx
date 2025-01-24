import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { ReactNode } from 'react';
import WhyLabsTooltip from './WhyLabsTooltip';

const useStyles = createStyles(() => ({
  labelWithTooltip: {
    position: 'relative',
  },
  button: {
    background: 'transparent',
    border: 'none',
    color: Colors.brandPrimary900,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: `2px 4px`,
    position: 'absolute',
    right: -14,
    top: -6,
  },
}));

type InputLabelTooltipProps = {
  children: ReactNode;
  label: ReactNode;
};

export const InputLabelTooltip: React.FC<InputLabelTooltipProps> = ({ children, label }) => {
  const { classes } = useStyles();

  return (
    <div className={classes.labelWithTooltip}>
      {children}
      <WhyLabsTooltip label={label}>
        <button className={classes.button} type="button">
          ?
        </button>
      </WhyLabsTooltip>
    </div>
  );
};
