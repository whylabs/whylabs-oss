import { SegmentedControl, SegmentedControlProps } from '@mantine/core';
import { FC } from 'react';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';

export type WhyLabsSegmentedControlProps = Pick<
  SegmentedControlProps,
  'onChange' | 'styles' | 'data' | 'disabled' | 'defaultChecked' | 'defaultValue' | 'color' | 'value' | 'size'
> & { disabledTooltip?: string };

const WhyLabsSegmentedControl: FC<WhyLabsSegmentedControlProps> = ({ disabled, disabledTooltip, ...rest }) => {
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <SegmentedControl size="xs" disabled={disabled} data-testid="WhyLabsSegmentedControl" {...rest} />
    </TooltipWrapper>
  );
};

export default WhyLabsSegmentedControl;
