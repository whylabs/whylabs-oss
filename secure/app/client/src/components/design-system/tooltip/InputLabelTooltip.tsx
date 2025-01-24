import { createStyles } from '@mantine/core';
import { JSX, ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

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
    fontWeight: 'bold',
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

export const InputLabelTooltip = ({ children, label }: InputLabelTooltipProps): JSX.Element => {
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
