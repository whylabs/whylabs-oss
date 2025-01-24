import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { forwardRef } from 'react';
import WhyLabsButton, { WhyLabsButtonProps } from './WhyLabsButton';

const useStyles = createStyles(() => ({
  submit: {
    border: 'none',
    background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    '&:hover': {
      background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    },
    color: `${Colors.white} !important`,
    '&[disabled]': {
      color: `${Colors.secondaryLight700} !important`,
      background: '#E9ECEF !important',
    },
  },
}));

export type WhyLabsSubmitButtonProps = Omit<WhyLabsButtonProps, 'variant'>;

const WhyLabsSubmitButton = forwardRef<HTMLButtonElement, WhyLabsSubmitButtonProps>(
  ({ children, className, type = 'submit', ...rest }, ref): JSX.Element => {
    const { classes, cx } = useStyles();

    return (
      <WhyLabsButton
        className={cx(classes.submit, className)}
        color="gray"
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
