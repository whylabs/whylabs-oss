import React, { MouseEventHandler } from 'react';
import { Button as MaterialButton } from '@material-ui/core';

interface ButtonProps {
  variant?: 'text' | 'outlined' | 'contained' | undefined;
  color?: 'inherit' | 'primary' | 'secondary' | 'default' | undefined;
  className?: string;
  href?: string;
  onClick?: MouseEventHandler;
  style?: React.CSSProperties;
  disableElevation?: boolean;
  text: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  href,
  text,
  className,
  onClick,
  style,
  disableElevation,
  disabled = false,
}) => (
  <MaterialButton
    disableElevation={disableElevation}
    style={style}
    onClick={onClick}
    className={className}
    variant={variant}
    color={color}
    href={href}
    disabled={disabled}
  >
    {text}
  </MaterialButton>
);

export default Button;
