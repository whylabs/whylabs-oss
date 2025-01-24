import { forwardRef } from 'react';

import { useCommonButtonStyles } from './buttonStyleUtils';
import WhyLabsButton, { WhyLabsButtonProps } from './WhyLabsButton';

export type WhyLabsSubmitButtonProps = Omit<WhyLabsButtonProps, 'variant' | 'type'>;

const WhyLabsSubmitButton = forwardRef<HTMLButtonElement, WhyLabsSubmitButtonProps>(
  ({ children, className, ...rest }, ref): JSX.Element => {
    const { classes, cx } = useCommonButtonStyles();

    return (
      <WhyLabsButton
        className={cx(classes.gradient, className)}
        data-testid="WhyLabsSubmitButton"
        {...rest}
        ref={ref}
        type="submit"
        variant="filled"
      >
        {children}
      </WhyLabsButton>
    );
  },
);

export default WhyLabsSubmitButton;
