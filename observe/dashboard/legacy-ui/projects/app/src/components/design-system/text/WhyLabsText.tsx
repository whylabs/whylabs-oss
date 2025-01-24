import { Text, TextProps } from '@mantine/core';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';

export type WhyLabsTextProps = TextProps & { displayTooltip?: boolean; id?: string; tooltipMaxWidth?: number };

const WhyLabsText: React.FC<WhyLabsTextProps> = ({
  children,
  displayTooltip,
  tooltipMaxWidth = 400,
  size,
  ...rest
}) => {
  return (
    <TooltipWrapper displayTooltip={displayTooltip} label={children} maxWidth={tooltipMaxWidth}>
      <Text data-testid="WhyLabsText" {...rest} size={size ?? '16px'}>
        {children}
      </Text>
    </TooltipWrapper>
  );
};

export default WhyLabsText;
