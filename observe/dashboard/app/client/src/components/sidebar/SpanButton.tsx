import { createStyles } from '@mantine/core';

import { ClickableDiv } from '../misc/ClickableDiv';

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

export const SpanButton = ({
  'aria-label': ariaLabel,
  onClick,
  children,
  className,
  id,
}: SpanButtonProps): JSX.Element => {
  const { classes, cx } = useStyles();
  return (
    <ClickableDiv aria-label={ariaLabel} className={cx(classes.root, className)} id={id} onClick={onClick}>
      {children}
    </ClickableDiv>
  );
};
