import WhyLabsTooltip, { WhyLabsTooltipProps } from './WhyLabsTooltip';

interface TooltipWrapperProps extends WhyLabsTooltipProps {
  displayTooltip?: boolean;
}
export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ displayTooltip, children, ...rest }) => {
  const { label } = rest;
  if (displayTooltip && label) {
    return <WhyLabsTooltip {...rest}>{children}</WhyLabsTooltip>;
  }

  return <>{children}</>;
};
