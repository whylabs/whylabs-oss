import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    cursor: 'pointer',
    '&:focus-visible': {
      outline: '0px solid transparent',
    },
  },
});

export interface SpanButtonProps {
  'aria-label': string;
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly className?: string;
  id?: string;
}

export function SpanButton({
  'aria-label': ariaLabel,
  onClick,
  children,
  className,
  id,
}: SpanButtonProps): JSX.Element {
  const { classes, cx } = useStyles();
  return (
    <div
      aria-label={ariaLabel}
      className={cx(classes.root, className)}
      onClick={onClick}
      role="button"
      onKeyPress={onClick}
      tabIndex={0}
      id={id}
    >
      {children}
    </div>
  );
}
