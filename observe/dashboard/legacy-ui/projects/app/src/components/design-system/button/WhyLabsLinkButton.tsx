import { Button } from '@mantine/core';
import { forwardRef } from 'react';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { DefaultWhyLabsButtonProps, useButtonStyles } from './utils';

export type WhyLabsLinkButtonProps = DefaultWhyLabsButtonProps & {
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top' | 'framename';
};

const WhyLabsLinkButton = forwardRef<HTMLAnchorElement, WhyLabsLinkButtonProps>(
  (
    {
      className,
      id,
      children,
      color = 'primary',
      target = '_self',
      disabled,
      loading,
      disabledTooltip,
      variant = 'filled',
      width = 'fit-content',
      size = 'sm',
      ...rest
    },
    ref,
  ): JSX.Element => {
    const { classes, cx } = useButtonStyles(width);

    return (
      <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
        <Button
          id={id}
          component="a"
          target={target}
          className={className}
          rel="noopener noreferrer"
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
          data-testid="WhyLabsLinkButton"
          {...rest}
          data-disabled={disabled || loading}
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

export default WhyLabsLinkButton;
