import { SegmentedControl, SegmentedControlProps } from '@mantine/core';
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
> & { disabledTooltip?: string };

const WhyLabsSegmentedControl: FC<WhyLabsSegmentedControlProps> = ({
  disabled,
  disabledTooltip,
  size = 'sm',
  ...rest
}) => {
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <SegmentedControl disabled={disabled} data-testid="WhyLabsSegmentedControl" size={size} {...rest} />
    </TooltipWrapper>
  );
};

export default WhyLabsSegmentedControl;
