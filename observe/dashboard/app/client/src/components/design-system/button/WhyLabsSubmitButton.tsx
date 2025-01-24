import { forwardRef } from 'react';

import { useCommonButtonStyles } from './buttonStyleUtils';
import WhyLabsButton, { WhyLabsButtonProps } from './WhyLabsButton';

export type WhyLabsSubmitButtonProps = Omit<WhyLabsButtonProps, 'variant'>;

const WhyLabsSubmitButton = forwardRef<HTMLButtonElement, WhyLabsSubmitButtonProps>(
  ({ children, className, type = 'submit', ...rest }, ref): JSX.Element => {
    const { classes, cx } = useCommonButtonStyles();

    return (
      <WhyLabsButton
        className={cx(classes.gradient, className)}
        data-testid="WhyLabsSubmitButton"
        {...rest}
        ref={ref}
        type={type}
        variant="filled"
      >
        {children}
      </WhyLabsButton>
    );
  },
);

export default WhyLabsSubmitButton;
