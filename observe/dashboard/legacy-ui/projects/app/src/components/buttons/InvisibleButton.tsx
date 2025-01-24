import { createStyles } from '@mantine/core';
import { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

const useStyles = createStyles(() => ({
  invisibleButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    margin: 0,
    padding: 0,
    width: '100%',
    lineHeight: 1,
    textAlign: 'inherit',
  },
}));

type Events = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'onMouseDown' | 'onMouseUp' | 'onMouseMove' | 'onKeyDown'
>;
type InvisibleButtonProps = {
  id?: string;
  'aria-label'?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
} & Events;

export const InvisibleButton = ({ className, children, disabled, id, ...rest }: InvisibleButtonProps): ReactElement => {
  const { classes, cx } = useStyles();
  const { onClick, onMouseMove, onMouseDown } = rest;

  if ((!onClick && !onMouseDown && !onMouseMove) || disabled) {
    return (
      <div className={className} id={id}>
        {children}
      </div>
    );
  }

  return (
    <button id={id} className={cx(classes.invisibleButton, className)} {...rest} type="button">
      {children}
    </button>
  );
};
