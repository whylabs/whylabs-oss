import { Anchor, AnchorProps } from '@mantine/core';
import { JSX } from 'react';

export type WhyLabsAnchorProps = AnchorProps & {
  className?: string;
  onClick?: () => void;
  children?: string;
};

const WhyLabsAnchor = ({ children, ...rest }: WhyLabsAnchorProps): JSX.Element => {
  return (
    <Anchor data-testid="WhyLabsAnchor" {...rest}>
      {children}
    </Anchor>
  );
};

export default WhyLabsAnchor;
