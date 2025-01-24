import { Anchor, AnchorProps } from '@mantine/core';

export type WhyLabsAnchorProps = AnchorProps & {
  className?: string;
  onClick?: () => void;
  children?: string;
};

const WhyLabsAnchor: React.FC<WhyLabsAnchorProps> = ({ children, ...rest }) => {
  return (
    <Anchor data-testid="WhyLabsAnchor" {...rest}>
      {children}
    </Anchor>
  );
};

export default WhyLabsAnchor;
