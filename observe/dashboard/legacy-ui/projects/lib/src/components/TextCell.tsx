import { Cell } from 'fixed-data-table-2';
import React from 'react';
import { createStyles } from '@mantine/core';

const useCellStyles = createStyles({
  text: {
    fontFamily: 'Inconsolata',
    fontSize: '13px',
  },
  span: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  root: {
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    flexGrow: 1,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
export interface TextCellCellProps {
  readonly children: React.ReactNode;
  readonly disableCaps?: boolean;
  readonly className?: string;
  readonly typographyClassName?: string;
  readonly style?: React.CSSProperties;
  readonly textWidth?: number;
}

export function TextCell({
  children,
  disableCaps,
  className,
  style,
  textWidth,
  typographyClassName: typographyClass,
}: TextCellCellProps): JSX.Element {
  const { classes: styles, cx } = useCellStyles();

  return (
    <Cell className={cx(styles.root, className)}>
      <div style={style} className={cx(disableCaps || styles.capitalize, styles.text, typographyClass)}>
        <span style={{ width: textWidth }} className={styles.span}>
          {children}
        </span>
      </div>
    </Cell>
  );
}
