import { ActionIcon, ActionIconProps } from '@mantine/core';
import { forwardRef } from 'react';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

export type WhyLabsActionIconProps = Pick<
  ActionIconProps,
  'children' | 'className' | 'color' | 'disabled' | 'loading' | 'size' | 'variant'
> & {
  label: string;
  onClick?: () => void;
  tooltip?: string;
};

const WhyLabsActionIcon = forwardRef<HTMLButtonElement, WhyLabsActionIconProps>(
  ({ children, label, tooltip, ...rest }, ref): JSX.Element => {
    return (
      <WhyLabsTooltip label={tooltip || ''}>
        <ActionIcon data-testid="WhyLabsActionIcon" {...rest} aria-label={label} radius="sm" ref={ref}>
          {children}
        </ActionIcon>
      </WhyLabsTooltip>
    );
  },
);

export default WhyLabsActionIcon;
