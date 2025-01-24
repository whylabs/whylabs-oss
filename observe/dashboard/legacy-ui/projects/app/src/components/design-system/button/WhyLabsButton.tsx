import { Button } from '@mantine/core';
import { forwardRef } from 'react';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { DefaultWhyLabsButtonProps, useButtonStyles } from './utils';

export type WhyLabsButtonProps = DefaultWhyLabsButtonProps & {
  onClick?: () => void;
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
      enabledTooltip,
      variant = 'filled',
      formId,
      ...rest
    },
    ref,
  ): JSX.Element => {
    const { classes, cx } = useButtonStyles(width);

    const isDisabled = disabled || rest.loading;
    const tooltip = disabled ? disabledTooltip : enabledTooltip;
    const displayTooltip = (disabled && !!disabledTooltip) || (!disabled && !!enabledTooltip);

    return (
      <TooltipWrapper displayTooltip={displayTooltip} label={tooltip}>
        <Button
          classNames={{
            root: cx(classes.root, {
              [classes.danger]: color === 'danger' && variant === 'filled',
              [classes.dangerOutline]: color === 'danger' && variant === 'outline',
              [classes.success]: color === 'success',
              [classes.gray]: color === 'gray' && variant === 'filled',
              [classes.grayOutline]: color === 'gray' && variant === 'outline',
              [classes.withoutBorder]: variant === 'subtle',
            }),
          }}
          data-testid="WhyLabsButton"
          {...rest}
          disabled={isDisabled}
          // Fix known bug when used with tooltip https://mantine.dev/core/button/#disabled-button-with-tooltip
          data-disabled={isDisabled ? 'true' : undefined}
          form={formId}
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
