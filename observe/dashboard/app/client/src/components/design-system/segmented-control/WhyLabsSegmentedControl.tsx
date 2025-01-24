import { SegmentedControl, SegmentedControlProps, createStyles } from '@mantine/core';
import { FC } from 'react';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';

export type WhyLabsSegmentedControlProps = Pick<
  SegmentedControlProps,
  | 'classNames'
  | 'onChange'
  | 'styles'
  | 'data'
  | 'disabled'
  | 'defaultChecked'
  | 'defaultValue'
  | 'color'
  | 'value'
  | 'size'
> & { disabledTooltip?: string; customActiveColor?: { background: string; color: string } };

const useStyles = createStyles((_, { background, color }: { background?: string; color?: string }) => ({
  controlActive: {
    background,
  },
  label: {
    transitionDuration: '0ms',
    '&[data-active]': {
      color,
      '&:hover': {
        color,
      },
    },
  },
}));

const WhyLabsSegmentedControl: FC<WhyLabsSegmentedControlProps> = ({
  disabled,
  disabledTooltip,
  size = 'sm',
  customActiveColor,
  ...rest
}) => {
  const { classes } = useStyles(!disabled && customActiveColor ? customActiveColor : {});
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <SegmentedControl
        disabled={disabled}
        data-testid="WhyLabsSegmentedControl"
        size={size}
        {...rest}
        classNames={classes}
      />
    </TooltipWrapper>
  );
};

export default WhyLabsSegmentedControl;
