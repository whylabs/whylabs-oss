import { Text, TextProps } from '@mantine/core';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';

export type WhyLabsTextProps = TextProps & { displayTooltip?: boolean; id?: string };

const WhyLabsText = ({ children, displayTooltip, size = 16, ...rest }: WhyLabsTextProps): JSX.Element => {
  return (
    <TooltipWrapper displayTooltip={displayTooltip} label={children}>
      <Text data-testid="WhyLabsText" {...rest} size={size}>
        {children}
      </Text>
    </TooltipWrapper>
  );
};

export default WhyLabsText;
