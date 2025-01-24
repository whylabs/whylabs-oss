import { Button, ButtonProps, createStyles } from '@mantine/core';
import { forwardRef } from 'react';
import { Colors } from '~/assets/Colors';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';

const useStyles = createStyles((_, width: WhyLabsButtonProps['width']) => ({
  root: {
    fontWeight: 600,
    lineHeight: '20px',
    padding: '4px 12px',
    width: width === 'full' ? '100%' : 'fit-content',
  },
  dangerOutline: {
    borderColor: Colors.red,
    color: Colors.red,
  },
  danger: {
    borderColor: Colors.red,
    background: Colors.red,
    color: Colors.white,
    '&:hover': {
      background: `${Colors.brandRed4} !important`,
    },
  },
  success: {
    borderColor: Colors.attrColor,
    background: Colors.attrColor,
    color: Colors.black,
    '&:hover': {
      background: Colors.attrColor,
    },
  },
  gray: {
    background: Colors.white,
    borderColor: '#DDDDDD',
    color: Colors.grey,
    '&:hover': {
      background: '#DDDDDD',
    },
  },
  grayOutline: {
    background: Colors.transparent,
    borderColor: Colors.grey,
    color: Colors.secondaryLight1000,
  },
  withoutBorder: {
    borderColor: 'transparent',
  },
}));

export type WhyLabsButtonProps = Pick<
  ButtonProps,
  'children' | 'className' | 'disabled' | 'leftIcon' | 'loading' | 'rightIcon' | 'size' | 'type'
> & {
  'aria-label'?: string;
  onClick?: () => void;
  color?: 'primary' | 'danger' | 'gray' | 'success';
  id?: string;
  variant: 'filled' | 'outline' | 'subtle';
  // If the component is disabled, whether to display a tooltip explaining why it's disabled
  disabledTooltip?: string;
  width?: 'full' | 'fit-content';
};

const WhyLabsButton = forwardRef<HTMLButtonElement, WhyLabsButtonProps>(
  (
    {
      children,
      color = 'primary',
      size = 'sm',
      width = 'fit-content',
      disabled,
      disabledTooltip,
      variant = 'filled',
      ...rest
    },
    ref,
  ): JSX.Element => {
    const { classes, cx } = useStyles(width);

    const isDisabled = !!disabled || !!rest.loading;

    return (
      <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
        <Button
          classNames={{
            root: cx(classes.root, {
              [classes.danger]: color === 'danger' && variant === 'filled',
              [classes.dangerOutline]: color === 'danger' && variant === 'outline',
              [classes.success]: color === 'success',
              [classes.gray]: color === 'gray',
              [classes.grayOutline]: color === 'gray' && variant === 'outline',
              [classes.withoutBorder]: variant === 'subtle',
            }),
          }}
          data-testid="WhyLabsButton"
          {...rest}
          disabled={isDisabled}
          // Fix known bug when used with tooltip https://mantine.dev/core/button/#disabled-button-with-tooltip
          data-disabled={isDisabled ? 'true' : undefined}
          radius="sm"
          ref={ref}
          size={size}
          variant={variant}
        >
          {children}
        </Button>
      </TooltipWrapper>
    );
  },
);

export default WhyLabsButton;
