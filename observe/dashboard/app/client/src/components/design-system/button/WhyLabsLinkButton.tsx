import { ComponentProps } from 'react';
import { Link } from 'react-router-dom';

import WhyLabsButton, { WhyLabsButtonProps } from './WhyLabsButton';

export type WhyLabsLinkButtonProps = ComponentProps<typeof Link> & {
  buttonProps: Omit<WhyLabsButtonProps, 'children' | 'onClick'>;
};

const WhyLabsLinkButton = ({ buttonProps, children, ...linkProps }: WhyLabsLinkButtonProps) => {
  return (
    <Link {...linkProps}>
      <WhyLabsButton {...buttonProps}>{children}</WhyLabsButton>
    </Link>
  );
};

export default WhyLabsLinkButton;
