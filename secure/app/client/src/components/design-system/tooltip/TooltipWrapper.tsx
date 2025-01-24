import { JSX } from 'react';

import WhyLabsTooltip, { WhyLabsTooltipProps } from './WhyLabsTooltip';

interface TooltipWrapperProps extends WhyLabsTooltipProps {
  displayTooltip?: boolean;
}
export const TooltipWrapper = ({ displayTooltip, children, ...rest }: TooltipWrapperProps): JSX.Element => {
  if (displayTooltip && rest.label) {
    return <WhyLabsTooltip {...rest}>{children}</WhyLabsTooltip>;
  }

  return <>{children}</>;
};
